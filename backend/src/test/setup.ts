import { resolve } from 'path';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import Database from 'better-sqlite3';

const testDbDir = resolve(__dirname, '../../data');
if (!existsSync(testDbDir)) {
  mkdirSync(testDbDir, { recursive: true });
}

export function setupTestDb(name: string): Database.Database {
  const dbPath = resolve(testDbDir, `test-${name}.db`);
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = dbPath;

  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
  }

  const testDb = new Database(dbPath);

  testDb.pragma('journal_mode = DELETE');
  testDb.pragma('foreign_keys = ON');

  testDb.exec(`
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'bank',
  balance REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  parent_id INTEGER,
  color TEXT,
  icon TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  merchant TEXT,
  category_id INTEGER,
  account_id INTEGER,
  type TEXT NOT NULL DEFAULT 'expense',
  import_batch_id INTEGER,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  external_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS import_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  duplicate_rows INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  parser_type TEXT NOT NULL DEFAULT 'generic',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  priority INTEGER NOT NULL DEFAULT 0,
  contains_text TEXT,
  starts_with TEXT,
  ends_with TEXT,
  regex TEXT,
  category_id INTEGER,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
  `);

  testDb.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);`);
  testDb.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);`);
  testDb.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);`);
  testDb.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);`);

  const now = new Date().toISOString();
  const insertC = testDb.prepare(
    'INSERT OR IGNORE INTO categories (name, type, parent_id, color, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  testDb.transaction(() => {
    insertC.run('Salary', 'income', null, '#22c55e', 'briefcase', now, now);
    insertC.run('Food & Dining', 'expense', null, '#eab308', 'utensils', now, now);
    insertC.run('Transport', 'expense', null, '#f97316', 'car', now, now);
  })();

  const insertA = testDb.prepare(
    'INSERT OR IGNORE INTO accounts (name, type, balance, currency, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  testDb.transaction(() => {
    insertA.run('HDFC Savings', 'bank', 50000.0, 'INR', 1, now, now);
  })();

  return testDb;
}

export function teardownTestDb(name: string, db: Database.Database): void {
  db.close();
  const dbPath = resolve(testDbDir, `test-${name}.db`);
  try {
    if (existsSync(dbPath)) unlinkSync(dbPath);
  } catch {
    // ignore
  }
}
