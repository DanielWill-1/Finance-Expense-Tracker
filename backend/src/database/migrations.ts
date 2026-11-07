import type Database from 'better-sqlite3';

const initialSchema = `
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'bank',
  balance REAL NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'INR', is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'expense', parent_id INTEGER,
  color TEXT, icon TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, amount REAL NOT NULL, date TEXT NOT NULL, description TEXT NOT NULL,
  merchant TEXT, category_id INTEGER, account_id INTEGER, type TEXT NOT NULL DEFAULT 'expense', import_batch_id INTEGER,
  is_recurring INTEGER NOT NULL DEFAULT 0, notes TEXT, external_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS import_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL, imported_at TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0, imported_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0, duplicate_rows INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed', parser_type TEXT NOT NULL DEFAULT 'generic', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT, priority INTEGER NOT NULL DEFAULT 0, contains_text TEXT,
  starts_with TEXT, ends_with TEXT, regex TEXT, category_id INTEGER, enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, value TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_import_batch_id ON transactions(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_external_id ON transactions(external_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_rules_category_id ON rules(category_id);
CREATE INDEX IF NOT EXISTS idx_rules_enabled ON rules(enabled);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
`;

function createInitialSchema(database: Database.Database): void {
  database.exec(initialSchema);
}

function restrictAccountDeletion(database: Database.Database): void {
  const foreignKeys = database.pragma('foreign_key_list(transactions)') as {
    table: string;
    on_delete: string;
  }[];
  const accountForeignKey = foreignKeys.find((key) => key.table === 'accounts');
  if (!accountForeignKey || accountForeignKey.on_delete !== 'CASCADE') return;

  database.pragma('foreign_keys = OFF');
  try {
    const rebuild = database.transaction(() => {
      database.exec(`
        CREATE TABLE transactions_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT, amount REAL NOT NULL, date TEXT NOT NULL, description TEXT NOT NULL,
          merchant TEXT, category_id INTEGER, account_id INTEGER, type TEXT NOT NULL DEFAULT 'expense', import_batch_id INTEGER,
          is_recurring INTEGER NOT NULL DEFAULT 0, notes TEXT, external_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
        );
        INSERT INTO transactions_new (id, amount, date, description, merchant, category_id, account_id, type,
          import_batch_id, is_recurring, notes, external_id, created_at, updated_at)
        SELECT id, amount, date, description, merchant, category_id, account_id, type,
          import_batch_id, is_recurring, notes, external_id, created_at, updated_at FROM transactions;
        DROP TABLE transactions;
        ALTER TABLE transactions_new RENAME TO transactions;
        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
        CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
        CREATE INDEX IF NOT EXISTS idx_transactions_import_batch_id ON transactions(import_batch_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_external_id ON transactions(external_id);
      `);
    });
    rebuild();
  } finally {
    database.pragma('foreign_keys = ON');
  }
  const violations = database.pragma('foreign_key_check') as unknown[];
  if (violations.length)
    throw new Error('Account history migration failed foreign key integrity checks');
}

function purgeLegacySecrets(database: Database.Database): void {
  const rows = database.prepare('SELECT key FROM settings').all() as { key: string }[];
  const remove = database.prepare('DELETE FROM settings WHERE key = ?');
  const purge = database.transaction(() => {
    for (const row of rows) {
      if (/(?:api[_-]?key|secret|token|credential|password)/i.test(row.key)) remove.run(row.key);
    }
  });
  purge();
}

const migrations = [
  { version: 1, name: 'initial_schema', apply: createInitialSchema },
  { version: 2, name: 'preserve_transactions_on_account_delete', apply: restrictAccountDeletion },
  { version: 3, name: 'remove_legacy_secret_settings', apply: purgeLegacySecrets },
];

export const CURRENT_SCHEMA_VERSION = migrations[migrations.length - 1]!.version;

export function runMigrations(database: Database.Database): void {
  database.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)',
  );
  for (const migration of migrations) {
    const applied = database
      .prepare('SELECT 1 FROM schema_migrations WHERE version = ?')
      .get(migration.version);
    if (applied) continue;
    if (migration.version === 2) {
      migration.apply(database);
      database
        .prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)')
        .run(migration.version, migration.name, new Date().toISOString());
    } else {
      database.transaction(() => {
        migration.apply(database);
        database
          .prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)')
          .run(migration.version, migration.name, new Date().toISOString());
      })();
    }
  }
}
