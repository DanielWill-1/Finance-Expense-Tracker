import { resolve } from 'path';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import Database from 'better-sqlite3';
import { runMigrations } from '../database/migrations';

const testDbDir = resolve(__dirname, '../../data');

export function setupTestDb(name: string): Database.Database {
  if (!/^[a-z0-9-]+$/i.test(name))
    throw new Error('Test database name must be a simple identifier');
  if (!existsSync(testDbDir)) mkdirSync(testDbDir, { recursive: true });

  const dbPath = resolve(testDbDir, `test-${name}.db`);
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = dbPath;

  for (const path of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`, `${dbPath}-journal`]) {
    if (existsSync(path)) unlinkSync(path);
  }

  const testDb = new Database(dbPath);
  testDb.pragma('journal_mode = DELETE');
  testDb.pragma('foreign_keys = ON');
  runMigrations(testDb);

  const now = new Date().toISOString();
  const insertCategory = testDb.prepare(
    'INSERT INTO categories (name, type, parent_id, color, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  testDb.transaction(() => {
    insertCategory.run('Salary', 'income', null, '#22c55e', 'briefcase', now, now);
    insertCategory.run('Food & Dining', 'expense', null, '#eab308', 'utensils', now, now);
    insertCategory.run('Transport', 'expense', null, '#f97316', 'car', now, now);
  })();

  testDb
    .prepare(
      'INSERT INTO accounts (name, type, balance, currency, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .run('HDFC Savings', 'bank', 50000, 'INR', 1, now, now);

  return testDb;
}

export async function teardownTestDb(name: string, db: Database.Database): Promise<void> {
  try {
    const applicationDb = await import('../database/connection');
    applicationDb.closeDatabase();
  } catch {
    // This suite may not have imported the application connection.
  }
  db.close();
  const dbPath = resolve(testDbDir, `test-${name}.db`);
  for (const path of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`, `${dbPath}-journal`]) {
    try {
      if (existsSync(path)) unlinkSync(path);
    } catch {
      // Ignore cleanup errors from already-removed sidecars.
    }
  }
}
