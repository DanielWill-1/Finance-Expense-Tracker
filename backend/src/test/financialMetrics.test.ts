import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupTestDb, teardownTestDb } from './setup';
import type { AnalyticsService } from '../services/analyticsService';
import type { TransactionRepository } from '../repositories/transactionRepository';
import type { AccountRepository } from '../repositories/accountRepository';

let testDb: ReturnType<typeof setupTestDb>;
let analytics: AnalyticsService;
let transactions: TransactionRepository;
let accounts: AccountRepository;

beforeAll(async () => {
  testDb = setupTestDb('financial-metrics');
  const [serviceModule, transactionModule, accountModule] = await Promise.all([
    import('../services/analyticsService'),
    import('../repositories/transactionRepository'),
    import('../repositories/accountRepository'),
  ]);
  analytics = new serviceModule.AnalyticsService(new transactionModule.TransactionRepository());
  transactions = new transactionModule.TransactionRepository();
  accounts = new accountModule.AccountRepository();
});

afterAll(async () => {
  await teardownTestDb('financial-metrics', testDb);
});

function dateAtMonthOffset(monthOffset: number): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1))
    .toISOString()
    .slice(0, 10);
}

describe('financial metric definitions', () => {
  it('uses active account balances for net worth and keeps currencies separate', () => {
    const beforeTransactions = analytics.getSummary();
    expect(beforeTransactions.netWorth).toBe(50000);

    const foreignLiability = accounts.create({
      name: 'USD Card',
      type: 'card',
      balance: -125.25,
      currency: 'USD',
    });
    transactions.create({
      amount: 1.1,
      date: '2026-01-02',
      description: 'USD purchase',
      accountId: foreignLiability.id,
      type: 'expense',
    });
    const multiCurrency = analytics.getSummary();
    expect(multiCurrency.netWorth).toBeNull();
    expect(multiCurrency.netWorthByCurrency).toEqual([
      { currency: 'INR', amount: 50000 },
      { currency: 'USD', amount: -125.25 },
    ]);
    expect(
      multiCurrency.currencyTotals.find((item) => item.currency === 'USD')?.totalExpenses,
    ).toBe(1.1);

    accounts.update(foreignLiability.id, { isActive: false });
    expect(analytics.getSummary().netWorth).toBe(50000);
  });

  it('calculates burn rate over six completed calendar months, excluding older history', () => {
    const now = new Date();
    const firstIncluded = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, 1))
      .toISOString()
      .slice(0, 10);
    const priorMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 7, 1))
      .toISOString()
      .slice(0, 10);
    transactions.create({
      amount: 60,
      date: firstIncluded,
      description: 'Recent expense',
      type: 'expense',
    });
    transactions.create({
      amount: 1200,
      date: priorMonth,
      description: 'Old expense',
      type: 'expense',
    });
    expect(
      analytics.getSummary().currencyTotals.find((item) => item.currency === 'INR')?.burnRate,
    ).toBe(10);
  });

  it('uses actual monthly category totals, includes uncategorized spending, and names largest expenses', () => {
    const monthBeforeLast = dateAtMonthOffset(-2);
    const thisMonth = dateAtMonthOffset(0);
    const usdAccount = accounts.create({
      name: 'USD Checking',
      type: 'bank',
      balance: 250,
      currency: 'USD',
    });
    transactions.create({
      amount: 10,
      date: monthBeforeLast,
      description: 'Food month one',
      categoryId: 2,
      type: 'expense',
    });
    transactions.create({
      amount: 30,
      date: thisMonth,
      description: 'Food month three',
      categoryId: 2,
      type: 'expense',
    });
    transactions.create({
      amount: 5,
      date: thisMonth,
      description: 'Uncategorized expense',
      type: 'expense',
    });
    transactions.create({
      amount: 10,
      date: thisMonth,
      description: 'USD food',
      categoryId: 2,
      accountId: usdAccount.id,
      type: 'expense',
    });

    const foodTrend = analytics
      .getSpendingTrends(3)
      .find((trend) => trend.categoryName === 'Food & Dining');
    expect(foodTrend?.monthlyTotals.map((entry) => entry.amount)).toEqual([10, 0, 30]);
    expect(foodTrend?.changePercent).toBe(200);
    const categoryTotals = analytics.getCategoryTotals('expense', thisMonth, thisMonth);
    expect(
      categoryTotals.some(
        (category) =>
          category.categoryId === null && category.currency === 'INR' && category.total === 5,
      ),
    ).toBe(true);
    expect(
      categoryTotals.find(
        (category) => category.categoryName === 'Food & Dining' && category.currency === 'USD',
      )?.percentage,
    ).toBe(100);
    expect(
      categoryTotals.find(
        (category) => category.categoryName === 'Food & Dining' && category.currency === 'INR',
      )?.percentage,
    ).toBeCloseTo(85.71);
    const uncategorizedTrend = analytics
      .getSpendingTrends(3)
      .find((trend) => trend.categoryName === 'Uncategorized');
    expect(uncategorizedTrend?.changePercent).toBeNull();
    expect(uncategorizedTrend?.trend).toBe('up');
    expect(
      analytics.getLargestExpenses(10).find((expense) => expense.description === 'Food month three')
        ?.categoryName,
    ).toBe('Food & Dining');
    expect(
      analytics
        .getLargestExpenses(10)
        .some((expense) => expense.description === 'USD food' && expense.currency === 'USD'),
    ).toBe(true);
  });

  it('sums two-decimal values through integer minor units', () => {
    transactions.create({
      amount: 0.1,
      date: '2026-02-01',
      description: 'Dime one',
      type: 'expense',
    });
    transactions.create({
      amount: 0.2,
      date: '2026-02-01',
      description: 'Dime two',
      type: 'expense',
    });
    expect(transactions.getTotalExpense('2026-02-01', '2026-02-01')).toBe(0.3);
  });
});
