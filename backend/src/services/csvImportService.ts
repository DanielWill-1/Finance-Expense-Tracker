import { detectParser } from './parsers';
import { DuplicateDetectionService } from './duplicateDetectionService';
import { RuleEngineService } from './rulesEngineService';
import { TransactionRepository } from '../repositories/transactionRepository';
import { ImportRepository } from '../repositories/importRepository';
import { RuleRepository } from '../repositories/ruleRepository';
import { sqlite } from '../database/connection';
import Papa from 'papaparse';
import type { PaginationParams, SortParams } from '../utils/pagination';
import { NotFoundError, ValidationError } from '../utils/errors';

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
  suggestedCategoryId: number | null;
  suggestedCategoryName: string | null;
  matchedRule: string | null;
  isDuplicate: boolean;
  duplicateReason: string;
  validationErrors: string[];
  edits?: {
    categoryId?: number | null;
    description?: string;
    merchant?: string;
  };
}

export class CSVImportService {
  private importRepo = new ImportRepository();
  private transactionRepo = new TransactionRepository();
  private duplicateService = new DuplicateDetectionService();
  private ruleEngine = new RuleEngineService(new RuleRepository());

  parseCSV(fileContent: string): { headers: string[]; rows: Record<string, string>[] } {
    const result = Papa.parse<Record<string, string>>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    if (result.errors.length > 0 && result.data.length === 0) {
      throw new ValidationError(`CSV parse error: ${result.errors[0]?.message ?? 'unknown'}`);
    }

    return {
      headers: result.meta.fields ?? [],
      rows: result.data.filter((row) => Object.values(row).some((v) => v.trim() !== '')),
    };
  }

  createPreview(
    fileContent: string,
    filename: string,
  ): ImportPreview {
    const { headers, rows } = this.parseCSV(fileContent);
    if (rows.length === 0) throw new ValidationError('CSV file contains no data rows');

    const parser = detectParser(headers, rows.slice(0, 5));
    const parseResult = parser.parse(rows);

    const batch = this.importRepo.create({
      filename,
      totalRows: rows.length,
      importedRows: 0,
      skippedRows: parseResult.errors.length,
      duplicateRows: 0,
      status: 'preview',
      parserType: parser.name,
    });

    const existing = this.transactionRepo.findAll(
      {},
      { page: 1, limit: 100000, offset: 0 },
      { sortBy: 'date', sortOrder: 'desc' },
    );

    const duplicateChecks = this.duplicateService.checkRows(
      parseResult.rows,
      existing.data.map((t) => ({
        id: t.id,
        amount: t.amount,
        date: t.date,
        description: t.description,
        merchant: t.merchant,
        external_id: t.external_id,
      })),
    );

    const previewRows: ImportPreviewRow[] = parseResult.rows.map((row, idx) => {
      const dupe = duplicateChecks.find((d) => d.rowIndex === idx);
      const ruleMatch = this.ruleEngine.evaluateTransaction({
        description: row.description,
        merchant: row.merchant,
      });

      const validationErrors: string[] = [];
      if (!row.date) validationErrors.push('Missing date');
      if (!row.description) validationErrors.push('Missing description');
      if (!row.amount || row.amount <= 0) validationErrors.push('Invalid amount');

      return {
        index: idx,
        date: row.date,
        description: row.description,
        amount: row.amount,
        type: row.type,
        merchant: row.merchant ?? '',
        suggestedCategoryId: ruleMatch?.categoryId ?? null,
        suggestedCategoryName: ruleMatch ? `Rule match` : null,
        matchedRule: ruleMatch?.matchedBy ?? null,
        isDuplicate: dupe?.isDuplicate ?? false,
        duplicateReason: dupe?.reason ?? '',
        validationErrors,
      };
    });

    const validRows = previewRows.filter((r) => r.validationErrors.length === 0);
    const duplicates = previewRows.filter((r) => r.isDuplicate);
    const uncategorized = validRows.filter((r) => !r.suggestedCategoryId);
    const incomeRows = validRows.filter((r) => r.type === 'income');
    const expenseRows = validRows.filter((r) => r.type === 'expense');

    return {
      batchId: batch.id,
      filename,
      parserUsed: parser.name,
      totalRows: rows.length,
      validRows: previewRows,
      invalidRows: parseResult.errors,
      duplicateRows: duplicates.length,
      uncategorizedRows: uncategorized.length,
      summary: {
        totalAmount: validRows.reduce((sum, r) => sum + r.amount, 0),
        incomeCount: incomeRows.length,
        expenseCount: expenseRows.length,
        incomeTotal: incomeRows.reduce((sum, r) => sum + r.amount, 0),
        expenseTotal: expenseRows.reduce((sum, r) => sum + r.amount, 0),
      },
    };
  }

  commitImport(
    batchId: number,
    rows: { date: string; description: string; amount: number; type: 'income' | 'expense'; merchant?: string | null; categoryId?: number | null }[],
    accountId?: number,
  ): number {
    const batch = this.importRepo.findById(batchId);
    if (!batch) throw new NotFoundError('Import batch', batchId);

    const importBatch = sqlite.transaction(() => {
      let imported = 0;
      let skipped = 0;

      const insert = sqlite.prepare(
        `INSERT INTO transactions (amount, date, description, merchant, category_id, account_id, type, import_batch_id, is_recurring, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)`,
      );

      const now = new Date().toISOString();

      for (const row of rows) {
        try {
          insert.run(
            row.amount,
            row.date,
            row.description,
            row.merchant ?? null,
            row.categoryId ?? null,
            accountId ?? null,
            row.type ?? 'expense',
            batchId,
            now,
            now,
          );
          imported++;
        } catch {
          skipped++;
        }
      }

      this.importRepo.updateStatus(batchId, 'completed', {
        importedRows: imported,
        skippedRows: skipped,
        duplicateRows: 0,
      });

      return imported;
    });

    return importBatch();
  }

  undoImport(batchId: number): number {
    const batch = this.importRepo.findById(batchId);
    if (!batch) throw new NotFoundError('Import batch', batchId);

    if (batch.status === 'rolled_back') {
      throw new ValidationError('Import has already been undone');
    }

    const result = sqlite.transaction(() => {
      const deleted = sqlite.prepare('DELETE FROM transactions WHERE import_batch_id = ?').run(batchId);
      this.importRepo.updateStatus(batchId, 'rolled_back');
      return deleted.changes;
    })();

    return result;
  }

  getHistory(filter?: { status?: string }, pagination?: PaginationParams, sort?: SortParams) {
    return this.importRepo.findAll(filter, pagination, sort);
  }

  getBatchById(id: number) {
    const batch = this.importRepo.findById(id);
    if (!batch) throw new NotFoundError('Import batch', id);
    return batch;
  }
}

