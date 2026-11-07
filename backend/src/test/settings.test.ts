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

afterAll(async () => {
  await teardownTestDb('settings', testDb);
});

describe('Settings Endpoints', () => {
  it('GET /api/settings returns settings', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data).toBe('object');
  });

  it('PUT /api/settings updates and creates settings', async () => {
    const res = await request(app).put('/api/settings').send({ theme: 'light', currency: 'INR' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.theme).toBe('light');
  });

  it('GET /api/settings reflects updated values', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.body.data.theme).toBe('light');
  });

  it('rejects and never returns API key settings', async () => {
    const write = await request(app).put('/api/settings').send({ ai_api_key: 'synthetic-secret' });
    expect(write.status).toBe(400);
    testDb
      .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)')
      .run('ai_api_key', 'legacy-secret', new Date().toISOString());
    const read = await request(app).get('/api/settings');
    expect(read.body.data).not.toHaveProperty('ai_api_key');
  });
});
