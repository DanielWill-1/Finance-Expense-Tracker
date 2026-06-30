import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { setupTestDb, teardownTestDb } from './setup';
import type { Express } from 'express';

let app: Express;
let testDb: ReturnType<typeof setupTestDb>;

beforeAll(async () => {
  testDb = setupTestDb('settings');
  const mod = await import('../app');
  app = mod.default;
});

afterAll(() => {
  teardownTestDb('settings', testDb);
});

describe('Settings Endpoints', () => {
  it('GET /api/settings returns settings', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data).toBe('object');
  });

  it('PUT /api/settings updates and creates settings', async () => {
    const res = await request(app).put('/api/settings').send({
      test_key: 'test_value',
      another_key: 'another_value',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.test_key).toBe('test_value');
  });

  it('GET /api/settings reflects updated values', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.body.data.test_key).toBe('test_value');
  });
});
