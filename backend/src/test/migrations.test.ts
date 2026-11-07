import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../database/migrations';

describe('versioned database migrations', () => {
  it('initializes an empty database and records ordered versions', () => {
    const database = new Database(':memory:');
    runMigrations(database);
    const tables = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all() as { name: string }[];
    expect(tables.map((table) => table.name)).toContain('transactions');
    expect(
      database.prepare('SELECT version FROM schema_migrations ORDER BY version').all(),
    ).toEqual([{ version: 1 }, { version: 2 }, { version: 3 }]);
    database.close();
  });

  it('upgrades the old cascade constraint without losing ledger rows', () => {
    const database = new Database(':memory:');
    database.pragma('foreign_keys = ON');
    database.exec(`
      CREATE TABLE accounts (id INTEGER PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'bank', balance REAL NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'INR', is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'expense', parent_id INTEGER, color TEXT, icon TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE transactions (id INTEGER PRIMARY KEY, amount REAL NOT NULL, date TEXT NOT NULL, description TEXT NOT NULL, merchant TEXT, category_id INTEGER, account_id INTEGER, type TEXT NOT NULL DEFAULT 'expense', import_batch_id INTEGER, is_recurring INTEGER NOT NULL DEFAULT 0, notes TEXT, external_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE);
      INSERT INTO accounts VALUES (1, 'Checking', 'bank', 120, 'INR', 1, 'now', 'now');
      INSERT INTO transactions VALUES (1, 35, '2026-01-05', 'Groceries', NULL, NULL, 1, 'expense', NULL, 0, NULL, NULL, 'now', 'now');
    `);

    runMigrations(database);
    expect(database.prepare('SELECT id, amount, description FROM transactions').all()).toEqual([
      { id: 1, amount: 35, description: 'Groceries' },
    ]);
    expect(() => database.prepare('DELETE FROM accounts WHERE id = 1').run()).toThrow();
    expect(
      (
        database.pragma('foreign_key_list(transactions)') as { table: string; on_delete: string }[]
      ).find((key) => key.table === 'accounts')?.on_delete,
    ).toBe('RESTRICT');
    expect(database.pragma('foreign_key_check')).toEqual([]);
    database.close();
  });

  it('removes legacy credential-shaped settings without returning their values', () => {
    const database = new Database(':memory:');
    database.exec(
      'CREATE TABLE settings (id INTEGER PRIMARY KEY, key TEXT NOT NULL UNIQUE, value TEXT NOT NULL, updated_at TEXT NOT NULL)',
    );
    database
      .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)')
      .run('ai_api_key', 'synthetic-secret', 'now');
    database
      .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)')
      .run('theme', 'dark', 'now');
    runMigrations(database);
    expect(database.prepare('SELECT key FROM settings ORDER BY key').all()).toEqual([
      { key: 'theme' },
    ]);
    database.close();
  });
});
