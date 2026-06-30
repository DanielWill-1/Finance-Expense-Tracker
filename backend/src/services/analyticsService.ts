import { TransactionRepository } from '../repositories/transactionRepository';
import { RecurringDetectionService, type RecurringTransaction } from './recurringDetectionService';

export interface AnalyticsSummary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  burnRate: number;
  netWorth: number;
}

export interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface WeeklyData {
  week: string;
  income: number;
  expense: number;
}

export interface CategoryTotal {
  categoryId: number | null;
  categoryName: string | null;
  total: number;
  percentage: number;
}

export interface SpendingTrend {
  categoryName: string;
  monthlyAverages: { month: string; amount: number }[];
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

export interface LargestExpense {
  id: number;
  date: string;
  description: string;
  merchant: string | null;
  amount: number;
  categoryName: string | null;
}

export interface MerchantTotal {
  merchant: string;
  total: number;
  count: number;
}

export class AnalyticsService {
  private transactionRepo: TransactionRepository;
  private recurringService: RecurringDetectionService;

  constructor(transactionRepo: TransactionRepository) {
    this.transactionRepo = transactionRepo;
    this.recurringService = new RecurringDetectionService(transactionRepo);
  }

  getSummary(startDate?: string, endDate?: string, accountId?: number): AnalyticsSummary {
    const totalIncome = this.transactionRepo.getTotalIncome(startDate, endDate, accountId);
    const totalExpenses = this.transactionRepo.getTotalExpense(startDate, endDate, accountId);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
    const burnRate = totalExpenses > 0 ? totalExpenses / 12 : 0;

    return {
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate: Math.round(savingsRate * 100) / 100,
      burnRate: Math.round(burnRate * 100) / 100,
      netWorth: netSavings,
    };
  }

  getMonthlyTotals(year?: number, months?: number, accountId?: number): MonthlyData[] {
    const data = this.transactionRepo.getMonthlyTotals(year, months, accountId);
    return data.map((d) => ({ month: d.month, income: d.income, expense: d.expense, net: d.income - d.expense }));
  }

  getWeeklyTotals(weeks = 12, accountId?: number): WeeklyData[] {
    const bindings: (string | number)[] = [];
    if (accountId) bindings.push(accountId);

    const rows = this.transactionRepo.findAll(
      {},
      { page: 1, limit: 100000, offset: 0 },
      { sortBy: 'date', sortOrder: 'desc' },
    );

    const byWeek: Record<string, WeeklyData> = {};
    for (const tx of rows.data) {
      const d = new Date(tx.date);
      const dayOfWeek = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - dayOfWeek + 1);
      const weekKey = monday.toISOString().slice(0, 10);

      if (!byWeek[weekKey]) byWeek[weekKey] = { week: weekKey, income: 0, expense: 0 };
      if (tx.type === 'income') byWeek[weekKey]!.income += tx.amount;
      else byWeek[weekKey]!.expense += tx.amount;
    }

    return Object.values(byWeek)
      .sort((a, b) => b.week.localeCompare(a.week))
      .slice(0, weeks)
      .reverse();
  }

  getCategoryTotals(
    type: 'income' | 'expense',
    startDate?: string,
    endDate?: string,
    accountId?: number,
  ): CategoryTotal[] {
    const rows = this.transactionRepo.getCategoryTotals(type, startDate, endDate, accountId);
    const total = rows.reduce((s, r) => s + r.total, 0);
    return rows.map((r) => ({
      categoryId: r.category_id,
      categoryName: r.category_name,
      total: r.total,
      percentage: total > 0 ? Math.round((r.total / total) * 10000) / 100 : 0,
    }));
  }

  getSpendingTrends(months = 6): SpendingTrend[] {
    const monthly = this.transactionRepo.getMonthlyTotals(undefined, months);
    const categories = this.getCategoryTotals('expense');

    return categories.slice(0, 8).map((cat) => ({
      categoryName: cat.categoryName ?? 'Uncategorized',
      monthlyAverages: monthly.map((m) => ({
        month: m.month,
        amount: m.expense * (cat.percentage / 100),
      })),
      trend: cat.percentage > 20 ? 'up' : cat.percentage > 10 ? 'stable' : 'down',
      changePercent: 0,
    }));
  }

  getLargestExpenses(limit = 10): LargestExpense[] {
    const data = this.transactionRepo.findAll(
      { type: 'expense' },
      { page: 1, limit, offset: 0 },
      { sortBy: 'amount', sortOrder: 'desc' },
    );
    return data.data.map((t) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      merchant: t.merchant,
      amount: t.amount,
      categoryName: null,
    }));
  }

  getTopMerchants(limit = 10): MerchantTotal[] {
    const data = this.transactionRepo.findAll(
      {},
      { page: 1, limit: 100000, offset: 0 },
      { sortBy: 'date', sortOrder: 'desc' },
    );
    const byMerchant: Record<string, MerchantTotal> = {};
    for (const tx of data.data) {
      const key = (tx.merchant || tx.description).toLowerCase();
      if (!byMerchant[key]) byMerchant[key] = { merchant: tx.merchant || tx.description, total: 0, count: 0 };
      byMerchant[key]!.total += tx.amount;
      byMerchant[key]!.count++;
    }
    return Object.values(byMerchant)
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }

  getRecurringTransactions(): RecurringTransaction[] {
    return this.recurringService.detectSubscriptions();
  }

  getUpcomingRecurring(): RecurringTransaction[] {
    return this.recurringService.getUpcomingRecurring();
  }
}
