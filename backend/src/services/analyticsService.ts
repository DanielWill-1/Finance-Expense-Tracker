import type { TransactionRepository } from '../repositories/transactionRepository';
import { AccountRepository } from '../repositories/accountRepository';
import { RecurringDetectionService, type RecurringTransaction } from './recurringDetectionService';

export interface AnalyticsSummary {
  period: {
    startDate: string | null;
    endDate: string | null;
    isAllTime: boolean;
  };
  totalIncome: number | null;
  totalExpenses: number | null;
  netSavings: number | null;
  savingsRate: number | null;
  burnRate: number | null;
  netWorth: number | null;
  netWorthByCurrency: { currency: string; amount: number }[];
  currencyTotals: {
    currency: string;
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    savingsRate: number;
    burnRate: number;
  }[];
}

export interface MonthlyData {
  month: string;
  currency: string;
  income: number;
  expense: number;
  net: number;
}

export interface WeeklyData {
  week: string;
  currency: string;
  income: number;
  expense: number;
}

export interface CategoryTotal {
  categoryId: number | null;
  categoryName: string | null;
  currency: string;
  total: number;
  percentage: number;
}

export interface SpendingTrend {
  categoryName: string;
  currency: string;
  monthlyTotals: { month: string; amount: number }[];
  trend: 'up' | 'down' | 'stable';
  changePercent: number | null;
}

export interface LargestExpense {
  id: number;
  date: string;
  description: string;
  merchant: string | null;
  amount: number;
  categoryName: string | null;
  currency: string;
}

export interface MerchantTotal {
  merchant: string;
  currency: string;
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
    const currentMonth = new Date();
    const burnEnd = new Date(
      Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth(), 1),
    );
    const burnStart = new Date(
      Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() - 6, 1),
    );
    const isoDay = (date: Date) => date.toISOString().slice(0, 10);
    const cashflow = this.transactionRepo.getCashflowByCurrency(startDate, endDate, accountId);
    const burnCashflow = this.transactionRepo.getCashflowByCurrency(
      isoDay(burnStart),
      isoDay(new Date(burnEnd.getTime() - 1)),
      accountId,
    );
    const balances = new AccountRepository().getActiveBalancesByCurrency();
    const currencies = new Set([
      ...cashflow.map((row) => row.currency),
      ...burnCashflow.map((row) => row.currency),
      ...balances.map((row) => row.currency),
    ]);
    if (currencies.size === 0) currencies.add('INR');
    const balanceCurrencies =
      balances.length > 0 ? new Set(balances.map((row) => row.currency)) : new Set(['INR']);
    const netWorthByCurrency = [...balanceCurrencies].map((currency) => ({
      currency,
      amount: this.roundMoney(
        this.finite(balances.find((row) => row.currency === currency)?.balance ?? 0),
      ),
    }));
    const currencyTotals = [...currencies].map((currency) => {
      const period = cashflow.find((row) => row.currency === currency);
      const burn = burnCashflow.find((row) => row.currency === currency);
      const totalIncome = this.roundMoney(this.finite(period?.income ?? 0));
      const totalExpenses = this.roundMoney(this.finite(period?.expense ?? 0));
      const netSavings = this.roundMoney(totalIncome - totalExpenses);
      return {
        currency,
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate: totalIncome > 0 ? this.roundMoney((netSavings / totalIncome) * 100) : 0,
        burnRate: this.roundMoney(this.finite(burn?.expense ?? 0) / 6),
      };
    });
    const singleCurrency = currencyTotals.length === 1 ? currencyTotals[0] : null;
    const netWorth = balanceCurrencies.size === 1 ? (netWorthByCurrency[0]?.amount ?? 0) : null;

    return {
      period: {
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        isAllTime: !startDate && !endDate,
      },
      totalIncome: singleCurrency?.totalIncome ?? null,
      totalExpenses: singleCurrency?.totalExpenses ?? null,
      netSavings: singleCurrency?.netSavings ?? null,
      savingsRate: singleCurrency?.savingsRate ?? null,
      burnRate: singleCurrency?.burnRate ?? null,
      netWorth,
      netWorthByCurrency,
      currencyTotals,
    };
  }

  getMonthlyTotals(year?: number, months?: number, accountId?: number): MonthlyData[] {
    const data = this.transactionRepo.getMonthlyTotals(year, months, accountId);
    const valid = data
      .filter((d) => typeof d.month === 'string' && /^\d{4}-\d{2}$/.test(d.month))
      .map((d) => {
        const income = this.finite(d.income);
        const expense = this.finite(d.expense);
        return {
          month: d.month,
          currency: d.currency || 'INR',
          income,
          expense,
          net: this.finite(income - expense),
        };
      });
    const count = Math.min(Math.max(Math.floor(months ?? 12), 1), 24);
    const allowedMonths = new Set([...new Set(valid.map((row) => row.month))].sort().slice(-count));
    return valid
      .filter((row) => allowedMonths.has(row.month))
      .sort((a, b) => a.month.localeCompare(b.month) || a.currency.localeCompare(b.currency));
  }

  getWeeklyTotals(weeks = 12, accountId?: number): WeeklyData[] {
    const rows = this.getAllTransactions(accountId ? { accountId } : {});

    const byWeek: Record<string, WeeklyData> = {};
    for (const tx of rows) {
      const d = new Date(tx.date);
      if (
        !Number.isFinite(tx.amount) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(tx.date) ||
        Number.isNaN(d.getTime()) ||
        d.toISOString().slice(0, 10) !== tx.date
      )
        continue;
      const dayOfWeek = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - dayOfWeek + 1);
      const weekKey = monday.toISOString().slice(0, 10);

      const currency = tx.account_currency ?? 'INR';
      const key = `${weekKey}|${currency}`;
      if (!byWeek[key]) byWeek[key] = { week: weekKey, currency, income: 0, expense: 0 };
      if (tx.type === 'income')
        byWeek[key]!.income = this.roundMoney(this.finite(byWeek[key]!.income + tx.amount));
      else if (tx.type === 'expense')
        byWeek[key]!.expense = this.roundMoney(this.finite(byWeek[key]!.expense + tx.amount));
    }

    return Object.values(byWeek)
      .sort((a, b) => b.week.localeCompare(a.week) || a.currency.localeCompare(b.currency))
      .slice(
        0,
        Math.min(weeks, 52) *
          Math.max(new Set(Object.values(byWeek).map((item) => item.currency)).size, 1),
      )
      .reverse();
  }

  getCategoryTotals(
    type: 'income' | 'expense',
    startDate?: string,
    endDate?: string,
    accountId?: number,
  ): CategoryTotal[] {
    const rows = this.transactionRepo.getCategoryTotals(type, startDate, endDate, accountId);
    const safeRows = rows.map((r) => ({ ...r, total: this.finite(r.total) }));
    const totalsByCurrency = new Map<string, number>();
    for (const row of safeRows) {
      totalsByCurrency.set(
        row.currency,
        this.finite((totalsByCurrency.get(row.currency) ?? 0) + row.total),
      );
    }
    return safeRows.map((r) => ({
      categoryId: r.category_id,
      categoryName: r.category_name,
      currency: r.currency || 'INR',
      total: r.total,
      percentage:
        (totalsByCurrency.get(r.currency) ?? 0) > 0
          ? Math.round((r.total / (totalsByCurrency.get(r.currency) ?? 1)) * 10000) / 100
          : 0,
    }));
  }

  getSpendingTrends(months = 6): SpendingTrend[] {
    const count = Math.min(Math.max(Math.floor(months), 1), 24);
    const now = new Date();
    const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - count + 1, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const monthKeys = Array.from({ length: count }, (_, index) => {
      const date = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + index, 1));
      return date.toISOString().slice(0, 7);
    });
    const rows = this.transactionRepo.getMonthlyCategoryTotals(
      first.toISOString().slice(0, 10),
      end.toISOString().slice(0, 10),
    );
    const groups = new Map<
      string,
      { categoryName: string; currency: string; amounts: Map<string, number> }
    >();
    for (const row of rows) {
      const key = `${row.category_id ?? 'none'}|${row.currency}`;
      const group = groups.get(key) ?? {
        categoryName: row.category_name ?? 'Uncategorized',
        currency: row.currency,
        amounts: new Map<string, number>(),
      };
      group.amounts.set(row.month, this.roundMoney(this.finite(row.total)));
      groups.set(key, group);
    }
    const trends = [...groups.values()].map((group) => {
      const monthlyTotals = monthKeys.map((month) => ({
        month,
        amount: group.amounts.get(month) ?? 0,
      }));
      const firstAmount = monthlyTotals[0]?.amount ?? 0;
      const lastAmount = monthlyTotals[monthlyTotals.length - 1]?.amount ?? 0;
      const changePercent =
        firstAmount === 0
          ? lastAmount === 0
            ? 0
            : null
          : this.roundMoney(((lastAmount - firstAmount) / firstAmount) * 100);
      return {
        categoryName: group.categoryName,
        currency: group.currency,
        monthlyTotals,
        trend:
          changePercent === null || changePercent > 5
            ? ('up' as const)
            : changePercent < -5
              ? ('down' as const)
              : ('stable' as const),
        changePercent,
      };
    });
    const byCurrency = trends.reduce((result, trend) => {
      const currencyTrends = result.get(trend.currency) ?? [];
      currencyTrends.push(trend);
      result.set(trend.currency, currencyTrends);
      return result;
    }, new Map<string, SpendingTrend[]>());
    return [...byCurrency.values()].flatMap((currencyTrends) =>
      currencyTrends
        .sort(
          (a, b) =>
            b.monthlyTotals.reduce((sum, item) => sum + item.amount, 0) -
            a.monthlyTotals.reduce((sum, item) => sum + item.amount, 0),
        )
        .slice(0, 8),
    );
  }

  getLargestExpenses(limit = 10): LargestExpense[] {
    return this.transactionRepo.findLargestExpensesByCurrency(limit).map((t) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      merchant: t.merchant,
      amount: this.finite(t.amount),
      categoryName: t.category_name ?? null,
      currency: t.account_currency ?? 'INR',
    }));
  }

  getTopMerchants(limit = 10): MerchantTotal[] {
    const byMerchant: Record<string, MerchantTotal> = {};
    for (const tx of this.getAllTransactions({ type: 'expense' })) {
      const currency = tx.account_currency ?? 'INR';
      const key = `${(tx.merchant || tx.description).toLowerCase()}|${currency}`;
      if (!byMerchant[key])
        byMerchant[key] = { merchant: tx.merchant || tx.description, currency, total: 0, count: 0 };
      byMerchant[key]!.total = this.roundMoney(
        this.finite(byMerchant[key]!.total + this.finite(tx.amount)),
      );
      byMerchant[key]!.count++;
    }
    const merchantsByCurrency = new Map<string, MerchantTotal[]>();
    for (const merchant of Object.values(byMerchant)) {
      const merchants = merchantsByCurrency.get(merchant.currency) ?? [];
      merchants.push(merchant);
      merchantsByCurrency.set(merchant.currency, merchants);
    }
    return [...merchantsByCurrency.values()].flatMap((merchants) =>
      merchants.sort((a, b) => b.total - a.total).slice(0, limit),
    );
  }

  getRecurringTransactions(): RecurringTransaction[] {
    return this.recurringService.detectSubscriptions();
  }

  getUpcomingRecurring(): RecurringTransaction[] {
    return this.recurringService.getUpcomingRecurring();
  }

  private finite(value: number): number {
    return Number.isFinite(value) ? value : 0;
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private getAllTransactions(filter: Parameters<TransactionRepository['findAll']>[0] = {}) {
    const pageSize = 1000;
    const result: ReturnType<TransactionRepository['findAll']>['data'] = [];
    let page = 1;
    let total = 0;
    do {
      const batch = this.transactionRepo.findAll(
        filter,
        { page, limit: pageSize, offset: (page - 1) * pageSize },
        { sortBy: 'date', sortOrder: 'desc' },
      );
      result.push(...batch.data);
      total = batch.total;
      page++;
    } while (result.length < total);
    return result;
  }
}
