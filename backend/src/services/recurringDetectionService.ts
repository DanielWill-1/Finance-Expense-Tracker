import { TransactionRepository } from '../repositories/transactionRepository';

export interface RecurringTransaction {
  merchant: string;
  description: string;
  amount: number;
  frequency: string;
  occurrences: number;
  firstDate: string;
  lastDate: string;
  estimatedMonthlyCost: number;
  categoryId: number | null;
  categoryName: string | null;
}

export class RecurringDetectionService {
  constructor(private transactionRepo: TransactionRepository) {}

  detectSubscriptions(): RecurringTransaction[] {
    const all = this.transactionRepo.findAll(
      {},
      { page: 1, limit: 100000, offset: 0 },
      { sortBy: 'date', sortOrder: 'desc' },
    );

    const groups: Record<string, {
      rows: typeof all.data;
      merchant: string;
      amounts: number[];
      dates: string[];
    }> = {};

    for (const tx of all.data) {
      const key = (tx.merchant || tx.description).toLowerCase().trim();
      if (!groups[key]) {
        groups[key] = { rows: [], merchant: tx.merchant || tx.description, amounts: [], dates: [] };
      }
      groups[key]!.rows.push(tx);
      groups[key]!.amounts.push(tx.amount);
      groups[key]!.dates.push(tx.date);
    }

    const recurring: RecurringTransaction[] = [];

    for (const [, group] of Object.entries(groups)) {
      if (group.rows.length < 2) continue;

      const uniqueMonths = new Set(group.dates.map((d) => d.slice(0, 7)));
      if (uniqueMonths.size < 2) continue;

      const amounts = group.amounts;
      const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
      const consistent = amounts.every((a) => Math.abs(a - avg) < avg * 0.05);

      if (consistent) {
        const dates = group.dates.slice().sort();
        const firstRow = group.rows[0]!;

        recurring.push({
          merchant: group.merchant,
          description: firstRow.description,
          amount: Math.round(avg * 100) / 100,
          frequency: uniqueMonths.size >= 3 ? 'monthly' : 'likely monthly',
          occurrences: group.rows.length,
          firstDate: dates[0] ?? '',
          lastDate: dates[dates.length - 1] ?? '',
          estimatedMonthlyCost: Math.round(avg * 100) / 100,
          categoryId: firstRow.category_id,
          categoryName: null,
        });
      }
    }

    recurring.sort((a, b) => b.estimatedMonthlyCost - a.estimatedMonthlyCost);
    return recurring;
  }

  getUpcomingRecurring(): RecurringTransaction[] {
    return this.detectSubscriptions().slice(0, 10);
  }
}
