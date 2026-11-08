import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { setupTestDb, teardownTestDb } from './setup';
import type { Express } from 'express';

let app: Express;
let testDb: ReturnType<typeof setupTestDb>;

beforeAll(async () => {
  testDb = setupTestDb('categories');
  const mod = await import('../app');
  app = mod.default;
});

afterAll(async () => {
  await teardownTestDb('categories', testDb);
});

describe('Category CRUD', () => {
  let categoryId: number;

  it('POST /api/categories creates a category', async () => {
    const res = await request(app).post('/api/categories').send({
      name: 'Test Category',
      type: 'expense',
      color: '#ff0000',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Category');
    categoryId = res.body.data.id;
  });

  it('GET /api/categories lists categories with pagination', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/categories/:id returns a category', async () => {
    const res = await request(app).get(`/api/categories/${categoryId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(categoryId);
  });

  it('PUT /api/categories/:id updates a category', async () => {
    const res = await request(app)
      .put(`/api/categories/${categoryId}`)
      .send({ name: 'Updated Category' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Category');
  });

  it('renames linked categories without moving history or rules and blocks a linked type change', async () => {
    const now = new Date().toISOString();
    testDb
      .prepare(
        'INSERT INTO transactions (amount, date, description, category_id, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(12.5, '2026-11-05', 'Category history', categoryId, 'expense', now, now);
    testDb
      .prepare(
        'INSERT INTO rules (priority, contains_text, category_id, enabled, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(10, 'Category history', categoryId, 1, now);

    const changedType = await request(app)
      .put(`/api/categories/${categoryId}`)
      .send({ type: 'income' });
    expect(changedType.status).toBe(409);

    const renamed = await request(app)
      .put(`/api/categories/${categoryId}`)
      .send({ name: 'Renamed Category' });
    const history = await request(app).get('/api/transactions?search=Category%20history');
    const rules = await request(app).get('/api/rules');
    expect(renamed.status).toBe(200);
    expect(history.body.data[0].category_name).toBe('Renamed Category');
    expect(rules.body.data[0].category_id).toBe(categoryId);
  });

  it('DELETE /api/categories/:id deletes a category', async () => {
    const res = await request(app).delete(`/api/categories/${categoryId}`);
    expect(res.status).toBe(204);
  });

  it('GET /api/categories/:id returns 404 after delete', async () => {
    const res = await request(app).get(`/api/categories/${categoryId}`);
    expect(res.status).toBe(404);
  });
});
