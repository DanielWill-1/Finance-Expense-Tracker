import { sqlite } from '../database/connection';
import type { CreateTransactionInput, UpdateTransactionInput, TransactionFilterInput } from '../validators/transaction';
import type { PaginationParams, SortParams } from '../utils/pagination';

export interface TransactionRow {
  id: number;
  amount: number;
  date: string;
  description: string;
  merchant: string | null;
  category_id: number | null;
  account_id: number | null;
  type: 'income' | 'expense';
  import_batch_id: number | null;
  is_recurring: number;
  notes: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

const ALLOWED_SORT_FIELDS = ['id', 'amount', 'date', 'description', 'merchant', 'type', 'created_at'];

export class TransactionRepository {
  findAll(
    filter?: TransactionFilterInput,
    pagination?: PaginationParams,
    sort?: SortParams,
  ): { data: TransactionRow[]; total: number } {
    const conditions: string[] = [];
    const bindings: (string | number)[] = [];

    if (filter?.type) {
      conditions.push('t.type = ?');
      bindings.push(filter.type);
    }
    if (filter?.categoryId) {
      conditions.push('t.category_id = ?');
      bindings.push(filter.categoryId);
    }
    if (filter?.accountId) {
      conditions.push('t.account_id = ?');
      bindings.push(filter.accountId);
    }
    if (filter?.startDate) {
      conditions.push('t.date >= ?');
      bindings.push(filter.startDate);
    }
    if (filter?.endDate) {
      conditions.push('t.date <= ?');
      bindings.push(filter.endDate);
    }
    if (filter?.minAmount !== undefined) {
      conditions.push('t.amount >= ?');
      bindings.push(filter.minAmount);
    }
    if (filter?.maxAmount !== undefined) {
      conditions.push('t.amount <= ?');
      bindings.push(filter.maxAmount);
    }
    if (filter?.search) {
      conditions.push('(t.description LIKE ? OR t.merchant LIKE ?)');
      const term = `%${filter.search}%`;
      bindings.push(term, term);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { count } = sqlite
      .prepare(
        `SELECT COUNT(*) as count FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         LEFT JOIN accounts a ON t.account_id = a.id
         ${where}`,
      )
      .get(...bindings) as { count: number };
    const total = count;

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 50;
    const offset = (page - 1) * limit;
    const sortBy = sort?.sortBy && ALLOWED_SORT_FIELDS.includes(sort.sortBy) ? sort.sortBy : 'date';
    const sortOrder = sort?.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const data = sqlite
      .prepare(
        `SELECT t.*, c.name as category_name, a.name as account_name
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         LEFT JOIN accounts a ON t.account_id = a.id
         ${where}
         ORDER BY t.${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
      )
      .all(...bindings, limit, offset) as TransactionRow[];

    return { data, total };
  }

  findById(id: number): TransactionRow | undefined {
    return sqlite.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as TransactionRow | undefined;
  }

  create(input: CreateTransactionInput): TransactionRow {
    const now = new Date().toISOString();
    const isRecurring = input.isRecurring ? 1 : 0;
    const result = sqlite
      .prepare(
        `INSERT INTO transactions (amount, date, description, merchant, category_id, account_id, type, is_recurring, notes, external_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.amount,
        input.date,
        input.description,
        input.merchant ?? null,
        input.categoryId ?? null,
        input.accountId ?? null,
        input.type ?? 'expense',
        isRecurring,
        input.notes ?? null,
        input.externalId ?? null,
        now,
        now,
      );
    return this.findById(Number(result.lastInsertRowid))!;
  }

  update(id: number, input: UpdateTransactionInput): TransactionRow | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const updates: string[] = [];
    const bindings: (string | number | null)[] = [];

    if (input.amount !== undefined) {
      updates.push('amount = ?');
      bindings.push(input.amount);
    }
    if (input.date !== undefined) {
      updates.push('date = ?');
      bindings.push(input.date);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      bindings.push(input.description);
    }
    if (input.merchant !== undefined) {
      updates.push('merchant = ?');
      bindings.push(input.merchant);
    }
    if (input.categoryId !== undefined) {
      updates.push('category_id = ?');
      bindings.push(input.categoryId);
    }
    if (input.accountId !== undefined) {
      updates.push('account_id = ?');
      bindings.push(input.accountId);
    }
    if (input.type !== undefined) {
      updates.push('type = ?');
      bindings.push(input.type);
    }
    if (input.isRecurring !== undefined) {
      updates.push('is_recurring = ?');
      bindings.push(input.isRecurring ? 1 : 0);
    }
    if (input.notes !== undefined) {
      updates.push('notes = ?');
      bindings.push(input.notes);
    }

    if (updates.length === 0) return existing;

    updates.push('updated_at = ?');
    bindings.push(now);
    bindings.push(id);

    sqlite.prepare(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`).run(...bindings);
    return this.findById(id);
  }

  delete(id: number): boolean {
    const result = sqlite.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    return result.changes > 0;
  }

  getTotalIncome(startDate?: string, endDate?: string, accountId?: number): number {
    const conditions: string[] = ["type = 'income'"];
    const bindings: (string | number)[] = [];
    if (startDate) {
      conditions.push('date >= ?');
      bindings.push(startDate);
    }
    if (endDate) {
      conditions.push('date <= ?');
      bindings.push(endDate);
    }
    if (accountId) {
      conditions.push('account_id = ?');
      bindings.push(accountId);
    }
    const row = sqlite
      .prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE ${conditions.join(' AND ')}`)
      .get(...bindings) as { total: number };
    return row.total;
  }

  getTotalExpense(startDate?: string, endDate?: string, accountId?: number): number {
    const conditions: string[] = ["type = 'expense'"];
    const bindings: (string | number)[] = [];
    if (startDate) {
      conditions.push('date >= ?');
      bindings.push(startDate);
    }
    if (endDate) {
      conditions.push('date <= ?');
      bindings.push(endDate);
    }
    if (accountId) {
      conditions.push('account_id = ?');
      bindings.push(accountId);
    }
    const row = sqlite
      .prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE ${conditions.join(' AND ')}`)
      .get(...bindings) as { total: number };
    return row.total;
  }

  getMonthlyTotals(year?: number, months?: number, accountId?: number): { month: string; income: number; expense: number }[] {
    const limit = months ?? 12;
    const bindings: (string | number)[] = [];
    let dateFilter = '';
    if (year) {
      dateFilter = `AND strftime('%Y', date) = ?`;
      bindings.push(String(year));
    }
    if (accountId) {
      bindings.push(accountId);
    }

    const rows = sqlite
      .prepare(
        `SELECT
          strftime('%Y-%m', date) as month,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
         FROM transactions
         WHERE 1=1 ${dateFilter} ${accountId ? 'AND account_id = ?' : ''}
         GROUP BY month
         ORDER BY month DESC
         LIMIT ?`,
      )
      .all(...bindings, limit) as { month: string; income: number; expense: number }[];

    return rows.reverse();
  }

  getCategoryTotals(
    type: 'income' | 'expense',
    startDate?: string,
    endDate?: string,
    accountId?: number,
  ): { category_id: number | null; category_name: string | null; total: number }[] {
    const conditions: string[] = [`t.type = ?`];
    const bindings: (string | number)[] = [type];
    if (startDate) {
      conditions.push('t.date >= ?');
      bindings.push(startDate);
    }
    if (endDate) {
      conditions.push('t.date <= ?');
      bindings.push(endDate);
    }
    if (accountId) {
      conditions.push('t.account_id = ?');
      bindings.push(accountId);
    }

    return sqlite
      .prepare(
        `SELECT t.category_id, c.name as category_name, COALESCE(SUM(t.amount), 0) as total
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE ${conditions.join(' AND ')}
         GROUP BY t.category_id
         ORDER BY total DESC`,
      )
      .all(...bindings) as { category_id: number | null; category_name: string | null; total: number }[];
  }
}
