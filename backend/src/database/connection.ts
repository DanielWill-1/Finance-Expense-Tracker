import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { env } from '../config/env';
import { resolve, dirname } from 'path';
import { mkdirSync, existsSync } from 'fs';

const dbPath = resolve(dirname(__filename), '../../', env.DATABASE_URL);

const dbDir = resolve(dirname(__filename), '../../', 'data');
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);

sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite);
