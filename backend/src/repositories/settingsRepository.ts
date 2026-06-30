import { sqlite } from '../database/connection';

export interface SettingRow {
  id: number;
  key: string;
  value: string;
  updated_at: string;
}

export class SettingsRepository {
  getAll(): SettingRow[] {
    return sqlite.prepare('SELECT * FROM settings ORDER BY key').all() as SettingRow[];
  }

  getByKey(key: string): SettingRow | undefined {
    return sqlite.prepare('SELECT * FROM settings WHERE key = ?').get(key) as SettingRow | undefined;
  }

  upsert(key: string, value: string): SettingRow {
    const now = new Date().toISOString();
    const existing = this.getByKey(key);
    if (existing) {
      sqlite.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?').run(value, now, key);
      return this.getByKey(key)!;
    }
    sqlite.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)').run(key, value, now);
    return this.getByKey(key)!;
  }

  upsertMany(settings: Record<string, string>): void {
    const now = new Date().toISOString();
    const upsert = sqlite.transaction((pairs: [string, string][]) => {
      const stmt = sqlite.prepare(
        'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
      );
      for (const [key, value] of pairs) {
        stmt.run(key, value, now);
      }
    });
    upsert(Object.entries(settings));
  }

  delete(key: string): boolean {
    const result = sqlite.prepare('DELETE FROM settings WHERE key = ?').run(key);
    return result.changes > 0;
  }
}
