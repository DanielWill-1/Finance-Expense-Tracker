import { sqlite } from '../database/connection';
import type { CreateAccountInput, UpdateAccountInput } from '../validators/account';
import type { PaginationParams, SortParams } from '../utils/pagination';

export interface AccountRow {
  id: number;
  name: string;
  type: string;
  balance: number;
  currency: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

const ALLOWED_SORT_FIELDS = ['id', 'name', 'type', 'balance', 'created_at'];

export class AccountRepository {
  findAll(params?: PaginationParams & SortParams): { data: AccountRow[]; total: number } {
    const countRow = sqlite.prepare('SELECT COUNT(*) as count FROM accounts').get() as { count: number };
    const total = countRow.count;

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 50;
    const offset = (page - 1) * limit;
    const sortBy = params?.sortBy && ALLOWED_SORT_FIELDS.includes(params.sortBy) ? params.sortBy : 'created_at';
    const sortOrder = params?.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const data = sqlite
      .prepare(`SELECT * FROM accounts ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`)
      .all(limit, offset) as AccountRow[];

    return { data, total };
  }

  findAllSimple(): AccountRow[] {
    return sqlite.prepare('SELECT * FROM accounts ORDER BY name').all() as AccountRow[];
  }

  findById(id: number): AccountRow | undefined {
    return sqlite.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as AccountRow | undefined;
  }

  create(input: CreateAccountInput): AccountRow {
    const now = new Date().toISOString();
    const isActive = input.isActive ?? true;
    const result = sqlite
      .prepare(
        `INSERT INTO accounts (name, type, balance, currency, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(input.name, input.type ?? 'bank', input.balance ?? 0, input.currency ?? 'INR', isActive ? 1 : 0, now, now);
    return this.findById(Number(result.lastInsertRowid))!;
  }

  update(id: number, input: UpdateAccountInput): AccountRow | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const updates: string[] = [];
    const bindings: (string | number | null)[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      bindings.push(input.name);
    }
    if (input.type !== undefined) {
      updates.push('type = ?');
      bindings.push(input.type);
    }
    if (input.balance !== undefined) {
      updates.push('balance = ?');
      bindings.push(input.balance);
    }
    if (input.currency !== undefined) {
      updates.push('currency = ?');
      bindings.push(input.currency);
    }
    if (input.isActive !== undefined) {
      updates.push('is_active = ?');
      bindings.push(input.isActive ? 1 : 0);
    }

    if (updates.length === 0) return existing;

    updates.push('updated_at = ?');
    bindings.push(now);
    bindings.push(id);

    sqlite.prepare(`UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`).run(...bindings);
    return this.findById(id);
  }

  delete(id: number): boolean {
    const result = sqlite.prepare('DELETE FROM accounts WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
