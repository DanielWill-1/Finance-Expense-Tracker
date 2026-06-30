import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { setupTestDb, teardownTestDb } from './setup';
import type { Express } from 'express';

let app: Express;
let testDb: ReturnType<typeof setupTestDb>;

beforeAll(async () => {
  testDb = setupTestDb('health');
  const mod = await import('../app');
  app = mod.default;
});

afterAll(() => {
  teardownTestDb('health', testDb);
});

describe('Health Endpoint', () => {
  it('GET /api/health returns ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.database).toBe('connected');
  });

  it('GET /api/health returns environment info', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.data.environment).toBe('test');
  });
});
