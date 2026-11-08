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

  it('PUT /api/settings persists assistant preferences without exposing unused preference keys', async () => {
    const res = await request(app).put('/api/settings').send({
      ai_provider: 'openai',
      ai_model: 'synthetic-model',
      ai_enabled: false,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ai_provider).toBe('openai');
    expect(res.body.data.ai_model).toBe('synthetic-model');
    expect(res.body.data.ai_enabled).toBe('false');
  });

  it('GET /api/settings reflects saved assistant preferences', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.body.data.ai_model).toBe('synthetic-model');
    expect(res.body.data).not.toHaveProperty('theme');
    expect(res.body.data).not.toHaveProperty('language');
    expect(res.body.data).not.toHaveProperty('currency');
  });

  it('rejects unsupported legacy preferences without deleting the legacy value', async () => {
    const now = new Date().toISOString();
    testDb
      .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)')
      .run('theme', 'light', now);
    const write = await request(app).put('/api/settings').send({ theme: 'dark' });
    const read = await request(app).get('/api/settings');
    expect(write.status).toBe(400);
    expect(read.body.data).not.toHaveProperty('theme');
    expect(testDb.prepare('SELECT value FROM settings WHERE key = ?').get('theme')).toEqual({
      value: 'light',
    });
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

  it('requires an explicit matching provider when cloud consent is changed', async () => {
    const saved = await request(app).put('/api/settings').send({
      ai_provider: 'openai',
      ai_cloud_consent_provider: 'openai',
    });
    const invalid = await request(app).put('/api/settings').send({
      ai_provider: 'groq',
      ai_cloud_consent_provider: 'openai',
    });
    expect(saved.status).toBe(200);
    expect(saved.body.data.ai_cloud_consent_provider).toBe('openai');
    expect(invalid.status).toBe(400);
  });
});
