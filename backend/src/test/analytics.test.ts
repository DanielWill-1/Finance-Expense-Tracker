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
});

afterAll(() => {
  teardownTestDb('analytics', testDb);
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
  });

  it('GET /api/analytics/summary returns totals', async () => {
    const res = await request(app).get('/api/analytics/summary');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('totalIncome');
    expect(res.body.data).toHaveProperty('totalExpenses');
    expect(res.body.data).toHaveProperty('netSavings');
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
});
