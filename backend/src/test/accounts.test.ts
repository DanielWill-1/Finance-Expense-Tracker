import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { setupTestDb, teardownTestDb } from './setup';
import type { Express } from 'express';

let app: Express;
let testDb: ReturnType<typeof setupTestDb>;

beforeAll(async () => {
  testDb = setupTestDb('accounts');
  const mod = await import('../app');
  app = mod.default;
});

afterAll(async () => {
  await teardownTestDb('accounts', testDb);
});

describe('Account CRUD', () => {
  let accountId: number;

  it('POST /api/accounts creates an account', async () => {
    const res = await request(app).post('/api/accounts').send({
      name: 'Test Account',
      type: 'bank',
      balance: 1000,
      currency: 'USD',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Test Account');
    accountId = res.body.data.id;
  });

  it('GET /api/accounts lists accounts', async () => {
    const res = await request(app).get('/api/accounts');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/accounts/:id returns an account', async () => {
    const res = await request(app).get(`/api/accounts/${accountId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(accountId);
  });

  it('PUT /api/accounts/:id updates an account', async () => {
    const res = await request(app).put(`/api/accounts/${accountId}`).send({ balance: 2000 });
    expect(res.status).toBe(200);
    expect(res.body.data.balance).toBe(2000);
  });

  it('DELETE /api/accounts/:id deletes an account', async () => {
    const res = await request(app).delete(`/api/accounts/${accountId}`);
    expect(res.status).toBe(204);
  });

  it('GET /api/accounts/:id returns 404 after delete', async () => {
    const res = await request(app).get(`/api/accounts/${accountId}`);
    expect(res.status).toBe(404);
  });

  it('rejects deleting an account while preserving its linked transaction', async () => {
    const account = await request(app)
      .post('/api/accounts')
      .send({ name: 'History Account', balance: 500 });
    const transaction = await request(app).post('/api/transactions').send({
      amount: 25,
      date: '2026-01-02',
      description: 'History remains',
      accountId: account.body.data.id,
      type: 'expense',
    });
    const deleted = await request(app).delete(`/api/accounts/${account.body.data.id}`);
    const stillThere = await request(app).get(`/api/transactions/${transaction.body.data.id}`);
    expect(deleted.status).toBe(409);
    expect(stillThere.status).toBe(200);
  });

  it('prevents currency changes that would relabel historical transactions', async () => {
    const account = await request(app)
      .post('/api/accounts')
      .send({ name: 'Currency History', balance: 500, currency: 'USD' });
    await request(app).post('/api/transactions').send({
      amount: 25,
      date: '2026-01-03',
      description: 'USD history',
      accountId: account.body.data.id,
      type: 'expense',
    });

    const changed = await request(app)
      .put(`/api/accounts/${account.body.data.id}`)
      .send({ currency: 'INR' });
    const unchanged = await request(app).get(`/api/accounts/${account.body.data.id}`);
    expect(changed.status).toBe(409);
    expect(unchanged.body.data.currency).toBe('USD');
  });
});
