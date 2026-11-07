import { sqlite } from '../database/connection';

export interface PurgeCounts {
  transactions: number;
  importBatches: number;
  rules: number;
  categories: number;
  accounts: number;
  settings: number;
}

export class DatabaseRepository {
  async backup(destination: string): Promise<void> {
    await sqlite.backup(destination);
  }

  replaceDataFrom(source: string): void {
    sqlite.pragma('foreign_keys = OFF');
    try {
      sqlite.prepare('ATTACH DATABASE ? AS restored_data').run(source);
      try {
        sqlite.transaction(() => {
          sqlite.exec(
            'DELETE FROM transactions; DELETE FROM rules; DELETE FROM import_batches; DELETE FROM categories; DELETE FROM accounts; DELETE FROM settings;',
          );
          for (const table of [
            'accounts',
            'categories',
            'transactions',
            'import_batches',
            'rules',
            'settings',
          ]) {
            sqlite.exec(`INSERT INTO ${table} SELECT * FROM restored_data.${table}`);
          }
          const violations = sqlite.pragma('foreign_key_check') as unknown[];
          if (violations.length) throw new Error('Restored data failed foreign key checks');
        })();
      } finally {
        sqlite.prepare('DETACH DATABASE restored_data').run();
      }
    } finally {
      sqlite.pragma('foreign_keys = ON');
    }
  }

  purge(): PurgeCounts {
    return sqlite.transaction(() => {
      const counts = {
        transactions: sqlite.prepare('SELECT COUNT(*) as count FROM transactions').get() as {
          count: number;
        },
        importBatches: sqlite.prepare('SELECT COUNT(*) as count FROM import_batches').get() as {
          count: number;
        },
        rules: sqlite.prepare('SELECT COUNT(*) as count FROM rules').get() as { count: number },
        categories: sqlite.prepare('SELECT COUNT(*) as count FROM categories').get() as {
          count: number;
        },
        accounts: sqlite.prepare('SELECT COUNT(*) as count FROM accounts').get() as {
          count: number;
        },
        settings: sqlite.prepare('SELECT COUNT(*) as count FROM settings').get() as {
          count: number;
        },
      };
      sqlite.exec(
        'DELETE FROM transactions; DELETE FROM rules; DELETE FROM import_batches; DELETE FROM categories; DELETE FROM accounts; DELETE FROM settings;',
      );
      return {
        transactions: counts.transactions.count,
        importBatches: counts.importBatches.count,
        rules: counts.rules.count,
        categories: counts.categories.count,
        accounts: counts.accounts.count,
        settings: counts.settings.count,
      };
    })();
  }
}
