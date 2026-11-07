import Database from 'better-sqlite3';
import { env } from '../config/env';
import { resolve, dirname } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { runMigrations } from './migrations';

const dbPath = resolve(dirname(__filename), '../../', env.DATABASE_URL);

const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const sqlite: Database.Database = new Database(dbPath);

sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
runMigrations(sqlite);

export function closeDatabase(): void {
  if (sqlite.open) sqlite.close();
}

export { sqlite, dbPath as databasePath };
