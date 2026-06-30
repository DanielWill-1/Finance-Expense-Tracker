import { sqlite } from '../database/connection';
import type { PaginationParams, SortParams } from '../utils/pagination';

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
    const sortBy = sort?.sortBy && ALLOWED_SORT_FIELDS.includes(sort.sortBy) ? sort.sortBy : 'imported_at';
    const sortOrder = sort?.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const data = sqlite
      .prepare(`SELECT * FROM import_batches ${where} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`)
      .all(...bindings, limit, offset) as ImportBatchRow[];

    return { data, total };
  }

  findById(id: number): ImportBatchRow | undefined {
    return sqlite.prepare('SELECT * FROM import_batches WHERE id = ?').get(id) as ImportBatchRow | undefined;
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

  updateStatus(id: number, status: string, counts?: {
    importedRows?: number;
    skippedRows?: number;
    duplicateRows?: number;
  }): ImportBatchRow | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    const updates: string[] = ['status = ?'];
    const bindings: (string | number)[] = [status];

    if (counts?.importedRows !== undefined) {
      updates.push('imported_rows = ?');
      bindings.push(counts.importedRows);
    }
    if (counts?.skippedRows !== undefined) {
      updates.push('skipped_rows = ?');
      bindings.push(counts.skippedRows);
    }
    if (counts?.duplicateRows !== undefined) {
      updates.push('duplicate_rows = ?');
      bindings.push(counts.duplicateRows);
    }

    bindings.push(id);
    sqlite.prepare(`UPDATE import_batches SET ${updates.join(', ')} WHERE id = ?`).run(...bindings);
    return this.findById(id);
  }
}
