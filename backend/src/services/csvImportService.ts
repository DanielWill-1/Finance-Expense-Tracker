import { detectParser } from './parsers';
import {
  DuplicateDetectionService,
  type ExistingTransactionForDuplicate,
} from './duplicateDetectionService';
import { RuleEngineService } from './rulesEngineService';
import { TransactionRepository } from '../repositories/transactionRepository';
import { ImportRepository } from '../repositories/importRepository';
import { RuleRepository } from '../repositories/ruleRepository';
import { AccountRepository } from '../repositories/accountRepository';
import { CategoryRepository } from '../repositories/categoryRepository';
import type { ImportedTransactionRecord } from '../repositories/importRepository';
import Papa from 'papaparse';
import type { PaginationParams, SortParams } from '../utils/pagination';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';

const READ_PAGE_SIZE = 500;

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export interface ImportPreview {
  batchId: number;
  filename: string;
  parserUsed: string;
  totalRows: number;
  validRows: ImportPreviewRow[];
  invalidRows: { row: number; message: string }[];
  duplicateRows: number;
  uncategorizedRows: number;
  summary: {
    totalAmount: number;
    incomeCount: number;
    expenseCount: number;
    incomeTotal: number;
    expenseTotal: number;
  };
}

export interface ImportPreviewRow {
  index: number;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  merchant: string;
  externalId: string | null;
  suggestedCategoryId: number | null;
  suggestedCategoryName: string | null;
  matchedRule: string | null;
  isDuplicate: boolean;
  duplicateReason: string;
  validationErrors: string[];
}

export interface ImportCommitRow {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  merchant?: string | null;
  categoryId?: number | null;
  externalId?: string | null;
  keepDuplicate?: boolean;
}

export interface ImportCommitResult {
  imported: number;
  skipped: number;
  duplicates: number;
}

export class CSVImportService {
  private importRepo = new ImportRepository();
  private transactionRepo = new TransactionRepository();
  private duplicateService = new DuplicateDetectionService();
  private ruleEngine = new RuleEngineService(new RuleRepository());
  private accountRepo = new AccountRepository();
  private categoryRepo = new CategoryRepository();

  parseCSV(fileContent: string): { headers: string[]; rows: Record<string, string>[] } {
    const result = Papa.parse<Record<string, string>>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (result.errors.length > 0) {
      const firstError = result.errors[0];
      throw new ValidationError(
        `CSV parse error${firstError?.row === undefined ? '' : ` on row ${firstError.row + 1}`}: ${firstError?.message ?? 'invalid CSV'}`,
      );
    }

    return {
      headers: result.meta.fields ?? [],
      rows: result.data.filter((row) =>
        Object.values(row).some((value) => String(value ?? '').trim() !== ''),
      ),
    };
  }

  createPreview(fileContent: string, filename: string): ImportPreview {
    const { headers, rows } = this.parseCSV(fileContent);
    if (rows.length === 0) throw new ValidationError('CSV file contains no data rows');
    if (rows.length > 25000) throw new ValidationError('CSV files may contain at most 25,000 rows');

    const parser = detectParser(headers, rows.slice(0, 5));
    const parseResult = parser.parse(rows);
    const batch = this.importRepo.create({
      filename: filename.replace(/[\\/]/g, '_').slice(0, 255),
      totalRows: rows.length,
      importedRows: 0,
      skippedRows: parseResult.errors.length,
      duplicateRows: 0,
      status: 'preview',
      parserType: parser.name,
    });

    const existing = this.findAllForDuplicateDetection();
    const duplicateChecks = this.duplicateService.checkRows(parseResult.rows, existing);
    const ruleMatches = this.ruleEngine.evaluateTransactions(
      parseResult.rows.map((row) => ({
        description: row.description,
        merchant: row.merchant,
      })),
    );
    const categoriesById = new Map(
      this.categoryRepo.findAllSimple().map((category) => [category.id, category]),
    );
    const previewRows: ImportPreviewRow[] = parseResult.rows.map((row, index) => {
      const validationErrors: string[] = [];
      const amount = Number.isFinite(row.amount) ? row.amount : 0;
      if (!row.date) validationErrors.push('Missing date');
      else if (!isValidDate(row.date))
        validationErrors.push(
          'Invalid or ambiguous date; use an unambiguous date in YYYY-MM-DD format',
        );
      if (!row.description?.trim()) validationErrors.push('Missing description');
      if (amount <= 0) validationErrors.push('Invalid amount');
      const duplicate = duplicateChecks[index];
      const ruleMatch = ruleMatches[index];
      const suggestedCategory = ruleMatch?.categoryId
        ? categoriesById.get(ruleMatch.categoryId)
        : undefined;
      if (ruleMatch?.categoryId && (!suggestedCategory || suggestedCategory.type !== row.type)) {
        validationErrors.push(
          'Suggested category is unavailable or does not match the transaction type',
        );
      }
      return {
        index: row.sourceRow,
        date: row.date,
        description: row.description,
        amount,
        type: row.type,
        merchant: row.merchant ?? '',
        externalId: row.reference ?? null,
        suggestedCategoryId:
          suggestedCategory && suggestedCategory.type === row.type ? suggestedCategory.id : null,
        suggestedCategoryName: suggestedCategory?.type === row.type ? suggestedCategory.name : null,
        matchedRule: ruleMatch?.matchedBy ?? null,
        isDuplicate: duplicate?.isDuplicate ?? false,
        duplicateReason: duplicate?.reason ?? '',
        validationErrors,
      };
    });

    const validRows = previewRows.filter((row) => row.validationErrors.length === 0);
    const duplicateRows = previewRows.filter((row) => row.isDuplicate);
    const incomeRows = validRows.filter((row) => row.type === 'income');
    const expenseRows = validRows.filter((row) => row.type === 'expense');
    return {
      batchId: batch.id,
      filename: batch.filename,
      parserUsed: parser.name,
      totalRows: rows.length,
      validRows: previewRows,
      invalidRows: parseResult.errors,
      duplicateRows: duplicateRows.length,
      uncategorizedRows: validRows.filter((row) => !row.suggestedCategoryId).length,
      summary: {
        totalAmount: validRows.reduce((sum, row) => sum + row.amount, 0),
        incomeCount: incomeRows.length,
        expenseCount: expenseRows.length,
        incomeTotal: incomeRows.reduce((sum, row) => sum + row.amount, 0),
        expenseTotal: expenseRows.reduce((sum, row) => sum + row.amount, 0),
      },
    };
  }

  commitImport(batchId: number, rows: ImportCommitRow[], accountId?: number): ImportCommitResult {
    const batch = this.importRepo.findById(batchId);
    if (!batch) throw new NotFoundError('Import batch', batchId);
    if (batch.status !== 'preview')
      throw new ConflictError('This import batch has already been processed');
    if (accountId !== undefined && !this.accountRepo.findById(accountId)) {
      throw new ValidationError('Selected account does not exist');
    }

    const invalidRows: { index: number; reason: string }[] = [];
    const validated = rows.map((row, index) => {
      const errors: string[] = [];
      if (!row.date || !isValidDate(row.date)) errors.push('Invalid or missing date');
      if (!row.description?.trim()) errors.push('Missing description');
      if (!Number.isFinite(row.amount) || row.amount <= 0) errors.push('Invalid amount');
      if (row.type !== 'income' && row.type !== 'expense') errors.push('Invalid type');
      if (errors.length) invalidRows.push({ index, reason: errors.join('; ') });
      return { ...row, description: row.description.trim(), valid: errors.length === 0 };
    });
    if (invalidRows.length) {
      throw new ValidationError(
        `Cannot import: ${invalidRows.length} row(s) have invalid data. ` +
          invalidRows
            .slice(0, 3)
            .map((row) => `Row ${row.index + 1}: ${row.reason}`)
            .join(' | ') +
          (invalidRows.length > 3 ? ` and ${invalidRows.length - 3} more` : ''),
      );
    }

    const matches = this.ruleEngine.evaluateTransactions(
      validated.map((row) => ({
        description: row.description,
        merchant: row.merchant,
      })),
    );
    const categoriesById = new Map(
      this.categoryRepo.findAllSimple().map((category) => [category.id, category]),
    );
    const invalidCategories = validated.flatMap((row, index) => {
      const categoryId =
        row.categoryId !== undefined ? row.categoryId : (matches[index]?.categoryId ?? null);
      if (categoryId === null) return [];
      const category = categoriesById.get(categoryId);
      if (!category) return [`Category ${categoryId} no longer exists`];
      if (category.type !== row.type)
        return [`Category ${categoryId} does not match the transaction type`];
      return [];
    });
    if (invalidCategories.length)
      throw new ValidationError(invalidCategories.slice(0, 3).join('; '));
    const existing = this.findAllForDuplicateDetection();
    const duplicateChecks = this.duplicateService.checkRows(
      validated.map((row, index) => ({
        sourceRow: index + 1,
        date: row.date,
        description: row.description,
        amount: row.amount,
        type: row.type,
        ...(row.merchant ? { merchant: row.merchant } : {}),
        ...(row.externalId ? { reference: row.externalId } : {}),
        raw: {},
      })),
      existing,
      accountId,
    );

    let duplicates = 0;
    const now = new Date().toISOString();
    const records: ImportedTransactionRecord[] = [];
    validated.forEach((row, index) => {
      const duplicate = duplicateChecks[index];
      if (duplicate?.isDuplicate) duplicates++;
      if (duplicate?.isDuplicate && !row.keepDuplicate) return;
      records.push({
        amount: row.amount,
        date: row.date,
        description: row.description,
        merchant: row.merchant ?? null,
        categoryId:
          row.categoryId !== undefined ? row.categoryId : (matches[index]?.categoryId ?? null),
        accountId: accountId ?? null,
        type: row.type,
        batchId,
        externalId: row.externalId ?? null,
        now,
      });
    });
    const imported = records.length;
    const skipped = Math.max(0, batch.total_rows - imported);
    const committed = this.importRepo.commitPreviewBatch(batchId, records, {
      importedRows: imported,
      skippedRows: skipped,
      duplicateRows: duplicates,
    });
    if (!committed) throw new ConflictError('This import batch has already been processed');
    return { imported, skipped, duplicates };
  }

  undoImport(batchId: number): number {
    const batch = this.importRepo.findById(batchId);
    if (!batch) throw new NotFoundError('Import batch', batchId);
    if (batch.status !== 'completed') {
      throw new ConflictError(
        batch.status === 'rolled_back'
          ? 'Import has already been undone'
          : 'Only completed imports can be undone',
      );
    }

    const deleted = this.importRepo.rollbackCompletedBatch(batchId);
    if (deleted === null) throw new ConflictError('Import has already been processed');
    return deleted;
  }

  getHistory(filter?: { status?: string }, pagination?: PaginationParams, sort?: SortParams) {
    return this.importRepo.findAll(filter, pagination, sort);
  }

  getBatchById(id: number) {
    const batch = this.importRepo.findById(id);
    if (!batch) throw new NotFoundError('Import batch', id);
    return batch;
  }

  private findAllForDuplicateDetection(): ExistingTransactionForDuplicate[] {
    const all: ExistingTransactionForDuplicate[] = [];
    let page = 1;
    let total = 0;
    do {
      const result = this.transactionRepo.findAll(
        {},
        { page, limit: READ_PAGE_SIZE, offset: (page - 1) * READ_PAGE_SIZE },
        { sortBy: 'date', sortOrder: 'desc' },
      );
      total = result.total;
      all.push(
        ...result.data.map((row) => ({
          id: row.id,
          amount: row.amount,
          date: row.date,
          description: row.description,
          merchant: row.merchant,
          external_id: row.external_id,
          type: row.type,
          account_id: row.account_id,
        })),
      );
      page++;
    } while (all.length < total);
    return all;
  }
}
