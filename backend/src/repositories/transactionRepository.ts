import { sqlite } from '../database/connection';
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilterInput,
} from '../validators/transaction';
import type { PaginationParams, SortParams } from '../utils/pagination';
import { roundMoney } from '../utils/money';

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
  category_name?: string | null;
  account_name?: string | null;
  account_currency?: string | null;
}

const ALLOWED_SORT_FIELDS = [
  'id',
  'amount',
  'date',
  'description',
  'merchant',
  'type',
  'created_at',
];
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
        `SELECT t.*, c.name as category_name, a.name as account_name, a.currency as account_currency
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
    return sqlite.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as
      TransactionRow | undefined;
  }

  findAllForExport(page: number, limit: number): { data: TransactionRow[]; total: number } {
    const totalRow = sqlite.prepare('SELECT COUNT(*) as count FROM transactions').get() as {
      count: number;
    };
    const data = sqlite
      .prepare(
        `SELECT t.*, c.name as category_name, a.name as account_name, a.currency as account_currency
      FROM transactions t LEFT JOIN categories c ON c.id = t.category_id LEFT JOIN accounts a ON a.id = t.account_id
      ORDER BY t.date ASC, t.id ASC LIMIT ? OFFSET ?`,
      )
      .all(limit, (page - 1) * limit) as TransactionRow[];
    return { data, total: totalRow.count };
  }

  findLargestExpensesByCurrency(limit: number): TransactionRow[] {
    return sqlite
      .prepare(
        `WITH ranked_expenses AS (
      SELECT t.*, c.name as category_name, a.name as account_name,
        COALESCE(a.currency, 'INR') as account_currency,
        ROW_NUMBER() OVER (PARTITION BY COALESCE(a.currency, 'INR') ORDER BY t.amount DESC, t.id DESC) as currency_rank
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.type = 'expense'
    )
    SELECT * FROM ranked_expenses WHERE currency_rank <= ?
    ORDER BY account_currency ASC, amount DESC, id DESC`,
      )
      .all(limit) as TransactionRow[];
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
        roundMoney(input.amount),
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
      bindings.push(roundMoney(input.amount));
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
      .prepare(
        `SELECT COALESCE(SUM(CAST(ROUND(amount * 100) AS INTEGER)), 0) / 100.0 as total FROM transactions WHERE ${conditions.join(' AND ')}`,
      )
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
      .prepare(
        `SELECT COALESCE(SUM(CAST(ROUND(amount * 100) AS INTEGER)), 0) / 100.0 as total FROM transactions WHERE ${conditions.join(' AND ')}`,
      )
      .get(...bindings) as { total: number };
    return row.total;
  }

  getCashflowByCurrency(
    startDate?: string,
    endDate?: string,
    accountId?: number,
  ): { currency: string; income: number; expense: number }[] {
    const conditions: string[] = ['1 = 1'];
    const bindings: (string | number)[] = [];
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
        `SELECT COALESCE(a.currency, 'INR') as currency,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN CAST(ROUND(t.amount * 100) AS INTEGER) ELSE 0 END), 0) / 100.0 as income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN CAST(ROUND(t.amount * 100) AS INTEGER) ELSE 0 END), 0) / 100.0 as expense
      FROM transactions t LEFT JOIN accounts a ON a.id = t.account_id
      WHERE ${conditions.join(' AND ')} GROUP BY COALESCE(a.currency, 'INR') ORDER BY currency`,
      )
      .all(...bindings) as { currency: string; income: number; expense: number }[];
  }

  getMonthlyCategoryTotals(
    startDate: string,
    endDate: string,
  ): {
    month: string;
    category_id: number | null;
    category_name: string | null;
    currency: string;
    total: number;
  }[] {
    return sqlite
      .prepare(
        `SELECT strftime('%Y-%m', t.date) as month, t.category_id, c.name as category_name,
      COALESCE(a.currency, 'INR') as currency, COALESCE(SUM(CAST(ROUND(t.amount * 100) AS INTEGER)), 0) / 100.0 as total
      FROM transactions t LEFT JOIN categories c ON c.id = t.category_id LEFT JOIN accounts a ON a.id = t.account_id
      WHERE t.type = 'expense' AND t.date >= ? AND t.date < ? GROUP BY month, t.category_id, c.name, currency ORDER BY month`,
      )
      .all(startDate, endDate) as {
      month: string;
      category_id: number | null;
      category_name: string | null;
      currency: string;
      total: number;
    }[];
  }

  getMonthlyTotals(
    year?: number,
    months?: number,
    accountId?: number,
  ): { month: string; currency: string; income: number; expense: number }[] {
    const requestedMonths = Math.min(Math.max(Math.floor(months ?? 12), 1), 24);
    const windowMonths = year ? Math.min(requestedMonths, 12) : requestedMonths;
    const end = year
      ? new Date(Date.UTC(year + 1, 0, 1))
      : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1));
    const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - windowMonths, 1));
    const bindings: (string | number)[] = [
      start.toISOString().slice(0, 10),
      end.toISOString().slice(0, 10),
    ];
    if (accountId) {
      bindings.push(accountId);
    }

    const rows = sqlite
      .prepare(
        `SELECT
          strftime('%Y-%m', t.date) as month,
          COALESCE(a.currency, 'INR') as currency,
          COALESCE(SUM(CASE WHEN t.type = 'income' THEN CAST(ROUND(t.amount * 100) AS INTEGER) ELSE 0 END), 0) / 100.0 as income,
          COALESCE(SUM(CASE WHEN t.type = 'expense' THEN CAST(ROUND(t.amount * 100) AS INTEGER) ELSE 0 END), 0) / 100.0 as expense
         FROM transactions t LEFT JOIN accounts a ON a.id = t.account_id
         WHERE t.date IS NOT NULL AND t.date != '' AND t.date >= ? AND t.date < ? ${accountId ? 'AND t.account_id = ?' : ''}
         GROUP BY month, currency
           ORDER BY month DESC`,
      )
      .all(...bindings) as { month: string; currency: string; income: number; expense: number }[];

    return rows.filter((r) => r.month !== null).reverse();
  }

  getCategoryTotals(
    type: 'income' | 'expense',
    startDate?: string,
    endDate?: string,
    accountId?: number,
  ): {
    category_id: number | null;
    category_name: string | null;
    currency: string;
    total: number;
  }[] {
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
        `SELECT t.category_id, c.name as category_name, COALESCE(a.currency, 'INR') as currency, COALESCE(SUM(CAST(ROUND(t.amount * 100) AS INTEGER)), 0) / 100.0 as total
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         LEFT JOIN accounts a ON a.id = t.account_id
         WHERE ${conditions.join(' AND ')}
         GROUP BY t.category_id, c.name, currency
         ORDER BY total DESC`,
      )
      .all(...bindings) as {
      category_id: number | null;
      category_name: string | null;
      currency: string;
      total: number;
    }[];
  }
}
