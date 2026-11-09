import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { setupTestDb, teardownTestDb } from './setup';
import type { Express } from 'express';

let app: Express;
let testDb: ReturnType<typeof setupTestDb>;

beforeAll(async () => {
  testDb = setupTestDb('analytics');
  const mod = await import('../app');
  app = mod.default;
}, 30_000);

afterAll(async () => {
  await teardownTestDb('analytics', testDb);
});

describe('Analytics Endpoints', () => {
  beforeAll(async () => {
    const catRes = await request(app).post('/api/categories').send({
      name: 'Analytics Test',
      type: 'expense',
    });
    const categoryId = catRes.body.data.id;

    const acctRes = await request(app).post('/api/accounts').send({
      name: 'Analytics Test Account',
      type: 'bank',
    });
    const accountId = acctRes.body.data.id;

    await request(app).post('/api/transactions').send({
      amount: 1000,
      date: '2026-01-10',
      description: 'Income',
      merchant: 'Employer',
      categoryId,
      accountId,
      type: 'income',
    });

    await request(app).post('/api/transactions').send({
      amount: 300,
      date: '2026-01-15',
      description: 'Expense',
      merchant: 'Store',
      categoryId,
      accountId,
      type: 'expense',
    });
  }, 30_000);

  it('GET /api/analytics/summary returns totals', async () => {
    const res = await request(app).get('/api/analytics/summary');
    expect(res.status).toBe(200);
    expect(res.body.data.period).toEqual({ startDate: null, endDate: null, isAllTime: true });
    expect(res.body.data).toHaveProperty('totalIncome');
    expect(res.body.data).toHaveProperty('totalExpenses');
    expect(res.body.data).toHaveProperty('netSavings');
  });

  it('GET /api/analytics/summary reports the applied date bounds', async () => {
    const res = await request(app).get(
      '/api/analytics/summary?startDate=2026-01-01&endDate=2026-01-31',
    );
    expect(res.status).toBe(200);
    expect(res.body.data.period).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      isAllTime: false,
    });
    expect(res.body.data.totalIncome).toBe(1000);
    expect(res.body.data.totalExpenses).toBe(300);
  });

  it('GET /api/analytics/monthly returns monthly data', async () => {
    const res = await request(app).get('/api/analytics/monthly');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/analytics/categories returns category breakdown', async () => {
    const res = await request(app).get('/api/analytics/categories?type=expense');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/analytics/weekly skips malformed transaction dates', async () => {
    const now = new Date().toISOString();
    testDb
      .prepare(
        `INSERT INTO transactions (amount, date, description, type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(25, 'INVALID_DATE', 'Malformed legacy row', 'expense', now, now);

    const weekly = await request(app).get('/api/analytics/weekly');
    const monthly = await request(app).get('/api/analytics/monthly');
    expect(weekly.status).toBe(200);
    expect(monthly.status).toBe(200);
    expect(
      weekly.body.data.every(
        (row: { income: number; expense: number }) =>
          Number.isFinite(row.income) && Number.isFinite(row.expense),
      ),
    ).toBe(true);
    expect(
      monthly.body.data.every(
        (row: { month: string; income: number; expense: number; net: number }) =>
          /^\d{4}-\d{2}$/.test(row.month) &&
          Number.isFinite(row.income) &&
          Number.isFinite(row.expense) &&
          Number.isFinite(row.net),
      ),
    ).toBe(true);
  });
});
