import type { TransactionRepository } from '../repositories/transactionRepository';

export interface RecurringTransaction {
  merchant: string;
  description: string;
  amount: number;
  currency: string;
  frequency: string;
  occurrences: number;
  firstDate: string;
  lastDate: string;
  estimatedMonthlyCost: number;
  categoryId: number | null;
  categoryName: string | null;
  nextDueDate?: string;
  forecastBasis?: string;
}

function addOneMonthClamped(value: string): string | null {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  const day = parsed.getUTCDate();
  const year = parsed.getUTCFullYear();
  const month = parsed.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

export class RecurringDetectionService {
  constructor(private transactionRepo: TransactionRepository) {}

  detectSubscriptions(
    accountId?: number,
    startDate?: string,
    endDate?: string,
  ): RecurringTransaction[] {
    const transactions: ReturnType<TransactionRepository['findAll']>['data'] = [];
    const pageSize = 1000;
    let page = 1;
    let total = 0;
    do {
      const batch = this.transactionRepo.findAll(
        {
          type: 'expense',
          ...(accountId ? { accountId } : {}),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        },
        { page, limit: pageSize, offset: (page - 1) * pageSize },
        { sortBy: 'date', sortOrder: 'desc' },
      );
      transactions.push(...batch.data);
      total = batch.total;
      page++;
    } while (transactions.length < total);

    const groups = new Map<string, typeof transactions>();
    for (const transaction of transactions) {
      if (
        !Number.isFinite(transaction.amount) ||
        transaction.amount <= 0 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)
      )
        continue;
      const date = new Date(`${transaction.date}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== transaction.date)
        continue;
      const merchant = (transaction.merchant || transaction.description).trim();
      const currency = transaction.account_currency ?? 'INR';
      const key = `${merchant.toLowerCase()}|${currency}`;
      const group = groups.get(key) ?? [];
      group.push(transaction);
      groups.set(key, group);
    }

    const recurring: RecurringTransaction[] = [];
    for (const group of groups.values()) {
      const ordered = group.slice().sort((a, b) => a.date.localeCompare(b.date));
      if (ordered.length < 3 || new Set(ordered.map((row) => row.date.slice(0, 7))).size < 3)
        continue;
      const dates = ordered.map((row) => new Date(`${row.date}T00:00:00.000Z`).getTime());
      const gaps = dates
        .slice(1)
        .map((date, index) => Math.round((date - dates[index]!) / 86_400_000));
      if (gaps.some((gap) => gap < 26 || gap > 35)) continue;
      const averageCents =
        ordered.reduce((sum, row) => sum + Math.round(row.amount * 100), 0) / ordered.length;
      const average = Math.round(averageCents) / 100;
      if (average <= 0 || ordered.some((row) => Math.abs(row.amount - average) > average * 0.05))
        continue;
      const first = ordered[0]!;
      const last = ordered[ordered.length - 1]!;
      recurring.push({
        merchant: (last.merchant || last.description).trim(),
        description: last.description,
        amount: Math.round(average * 100) / 100,
        currency: last.account_currency ?? 'INR',
        frequency: 'monthly',
        occurrences: ordered.length,
        firstDate: first.date,
        lastDate: last.date,
        estimatedMonthlyCost: Math.round(average * 100) / 100,
        categoryId: last.category_id,
        categoryName: last.category_name ?? null,
      });
    }
    return recurring.sort((a, b) => b.estimatedMonthlyCost - a.estimatedMonthlyCost);
  }

  getUpcomingRecurring(): RecurringTransaction[] {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setUTCDate(horizon.getUTCDate() + 45);
    return this.detectSubscriptions()
      .flatMap((item) => {
        const nextDueDate = addOneMonthClamped(item.lastDate);
        if (!nextDueDate) return [];
        const due = new Date(`${nextDueDate}T00:00:00.000Z`);
        if (due < today || due > horizon) return [];
        return [
          {
            ...item,
            nextDueDate,
            forecastBasis: `Estimated from ${item.occurrences} monthly expense entries`,
          },
        ];
      })
      .slice(0, 10);
  }
}
