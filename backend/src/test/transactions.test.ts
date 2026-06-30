import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { setupTestDb, teardownTestDb } from './setup';
import type { Express } from 'express';

let app: Express;
let testDb: ReturnType<typeof setupTestDb>;

beforeAll(async () => {
  testDb = setupTestDb('transactions');
  const mod = await import('../app');
  app = mod.default;
});

afterAll(() => {
  teardownTestDb('transactions', testDb);
});

describe('Transaction CRUD', () => {
  let categoryId: number;
  let accountId: number;
  let txId: number;

  beforeAll(async () => {
    const catRes = await request(app).post('/api/categories').send({
      name: 'TX Test Category',
      type: 'expense',
    });
    categoryId = catRes.body.data.id;

    const acctRes = await request(app).post('/api/accounts').send({
      name: 'TX Test Account',
      type: 'bank',
      balance: 5000,
    });
    accountId = acctRes.body.data.id;
  });

  it('POST /api/transactions creates a transaction', async () => {
    const res = await request(app).post('/api/transactions').send({
      amount: 500,
      date: '2026-01-15',
      description: 'Test transaction',
      merchant: 'Test Store',
      categoryId,
      accountId,
      type: 'expense',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe(500);
    txId = res.body.data.id;
  });

  it('GET /api/transactions lists transactions with pagination', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/transactions/:id returns a transaction', async () => {
    const res = await request(app).get(`/api/transactions/${txId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(txId);
    expect(res.body.data.amount).toBe(500);
  });

  it('GET /api/transactions supports filtering by type', async () => {
    const res = await request(app).get('/api/transactions?type=expense');
    expect(res.status).toBe(200);
    for (const tx of res.body.data) {
      expect(tx.type).toBe('expense');
    }
  });

  it('GET /api/transactions supports search', async () => {
    const res = await request(app).get('/api/transactions?search=Test');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('PUT /api/transactions/:id updates a transaction', async () => {
    const res = await request(app).put(`/api/transactions/${txId}`).send({
      amount: 750,
      merchant: 'Updated Store',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.amount).toBe(750);
  });

  it('DELETE /api/transactions/:id deletes a transaction', async () => {
    const res = await request(app).delete(`/api/transactions/${txId}`);
    expect(res.status).toBe(204);
  });

  it('GET /api/transactions/:id returns 404 after delete', async () => {
    const res = await request(app).get(`/api/transactions/${txId}`);
    expect(res.status).toBe(404);
  });
});
