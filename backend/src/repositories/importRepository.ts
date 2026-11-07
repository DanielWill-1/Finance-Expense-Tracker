import { sqlite } from '../database/connection';
import type { PaginationParams, SortParams } from '../utils/pagination';
import { roundMoney } from '../utils/money';

export interface ImportBatchRow {
  id: number;
  filename: string;
  imported_at: string;
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  duplicate_rows: number;
  status: string;
  parser_type: string;
  created_at: string;
}

export interface ImportedTransactionRecord {
  amount: number;
  date: string;
  description: string;
  merchant: string | null;
  categoryId: number | null;
  accountId: number | null;
  type: 'income' | 'expense';
  batchId: number;
  externalId: string | null;
  now: string;
}

const ALLOWED_SORT_FIELDS = ['id', 'filename', 'imported_at', 'status'];

export class ImportRepository {
  findAll(
    filter?: { status?: string },
    pagination?: PaginationParams,
    sort?: SortParams,
  ): { data: ImportBatchRow[]; total: number } {
    const conditions: string[] = [];
    const bindings: string[] = [];

    if (filter?.status) {
      conditions.push('status = ?');
      bindings.push(filter.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRow = sqlite
      .prepare(`SELECT COUNT(*) as count FROM import_batches ${where}`)
      .get(...bindings) as { count: number };
    const total = countRow.count;

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 50;
    const offset = (page - 1) * limit;
    const sortBy =
      sort?.sortBy && ALLOWED_SORT_FIELDS.includes(sort.sortBy) ? sort.sortBy : 'imported_at';
    const sortOrder = sort?.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const data = sqlite
      .prepare(
        `SELECT * FROM import_batches ${where} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`,
      )
      .all(...bindings, limit, offset) as ImportBatchRow[];

    return { data, total };
  }

  findById(id: number): ImportBatchRow | undefined {
    return sqlite.prepare('SELECT * FROM import_batches WHERE id = ?').get(id) as
      ImportBatchRow | undefined;
  }

  commitPreviewBatch(
    id: number,
    rows: ImportedTransactionRecord[],
    counts: { importedRows: number; skippedRows: number; duplicateRows: number },
  ): boolean {
    return sqlite.transaction(() => {
      const claimed = sqlite
        .prepare(
          "UPDATE import_batches SET status = 'completed', imported_rows = ?, skipped_rows = ?, duplicate_rows = ? WHERE id = ? AND status = 'preview'",
        )
        .run(counts.importedRows, counts.skippedRows, counts.duplicateRows, id);
      if (claimed.changes !== 1) return false;

      const insert = sqlite.prepare(
        `INSERT INTO transactions (amount, date, description, merchant, category_id, account_id, type, import_batch_id, external_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const row of rows) {
        insert.run(
          roundMoney(row.amount),
          row.date,
          row.description,
          row.merchant,
          row.categoryId,
          row.accountId,
          row.type,
          row.batchId,
          row.externalId,
          row.now,
          row.now,
        );
      }
      return true;
    })();
  }

  rollbackCompletedBatch(id: number): number | null {
    return sqlite.transaction(() => {
      const updated = sqlite
        .prepare(
          "UPDATE import_batches SET status = 'rolled_back' WHERE id = ? AND status = 'completed'",
        )
        .run(id);
      if (updated.changes !== 1) return null;
      return sqlite.prepare('DELETE FROM transactions WHERE import_batch_id = ?').run(id).changes;
    })();
  }

  create(input: {
    filename: string;
    totalRows: number;
    importedRows: number;
    skippedRows: number;
    duplicateRows: number;
    status: string;
    parserType: string;
  }): ImportBatchRow {
    const now = new Date().toISOString();
    const result = sqlite
      .prepare(
        `INSERT INTO import_batches (filename, imported_at, total_rows, imported_rows, skipped_rows, duplicate_rows, status, parser_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.filename,
        now,
        input.totalRows,
        input.importedRows,
        input.skippedRows,
        input.duplicateRows,
        input.status,
        input.parserType,
        now,
      );
    return this.findById(Number(result.lastInsertRowid))!;
  }
}
