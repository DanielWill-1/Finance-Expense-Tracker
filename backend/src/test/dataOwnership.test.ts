import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import Papa from 'papaparse';
import { existsSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { setupTestDb, teardownTestDb } from './setup';
import type { DataOwnershipService } from '../services/dataOwnershipService';
import type { TransactionRepository } from '../repositories/transactionRepository';

let testDb: ReturnType<typeof setupTestDb>;
let service: DataOwnershipService;
let transactions: TransactionRepository;
let sqlite: Database.Database;
let databaseFile: string;
const recoveryFiles: string[] = [];

beforeAll(async () => {
  testDb = setupTestDb('data-ownership');
  const [serviceModule, repositoryModule, databaseModule] = await Promise.all([
    import('../services/dataOwnershipService'),
    import('../repositories/transactionRepository'),
    import('../database/connection'),
  ]);
  service = new serviceModule.DataOwnershipService();
  transactions = new repositoryModule.TransactionRepository();
  sqlite = databaseModule.sqlite;
  databaseFile = databaseModule.databasePath;
});

afterAll(async () => {
  for (const file of recoveryFiles) {
    try {
      if (existsSync(file)) rmSync(file, { force: true });
    } catch {
      /* clean test recovery files */
    }
  }
  await teardownTestDb('data-ownership', testDb);
});

describe('local data ownership tools', () => {
  it('backs up and restores data atomically, retaining a recovery snapshot', async () => {
    transactions.create({
      amount: 12.34,
      date: '2026-03-01',
      description: 'Backup row',
      type: 'expense',
    });
    const backup = await service.createDownloadBackup();
    expect(existsSync(backup)).toBe(true);
    const readOnly = new Database(backup, { readonly: true, fileMustExist: true });
    expect(
      (readOnly.prepare('SELECT COUNT(*) as count FROM transactions').get() as { count: number })
        .count,
    ).toBe(1);
    readOnly.close();

    transactions.create({ amount: 99, date: '2026-03-02', description: 'New row', type: 'income' });
    const recoveryName = await service.restoreFrom(backup);
    const recoveryPath = join(databaseFile.replace(/[\\/][^\\/]+$/, ''), 'backups', recoveryName);
    recoveryFiles.push(recoveryPath);
    expect(
      (sqlite.prepare('SELECT COUNT(*) as count FROM transactions').get() as { count: number })
        .count,
    ).toBe(1);
    expect(existsSync(recoveryPath)).toBe(true);
    rmSync(backup, { force: true });
  });

  it('rejects corrupt backups without changing the current database', async () => {
    const invalid = join(tmpdir(), `ghostledger-invalid-${Date.now()}.db`);
    writeFileSync(invalid, 'not a SQLite database');
    const before = (
      sqlite.prepare('SELECT COUNT(*) as count FROM transactions').get() as { count: number }
    ).count;
    await expect(service.restoreFrom(invalid)).rejects.toThrow(/valid GhostLedger backup/i);
    expect(
      (sqlite.prepare('SELECT COUNT(*) as count FROM transactions').get() as { count: number })
        .count,
    ).toBe(before);
    rmSync(invalid, { force: true });
  });

  it('exports stable columns with formula-leading text neutralized', () => {
    transactions.create({
      amount: 5.75,
      date: '2026-03-04',
      description: '=1+1',
      merchant: '@danger',
      type: 'expense',
    });
    const exported = Papa.parse<Record<string, string>>(service.exportTransactionsCSV(), {
      header: true,
    });
    expect(exported.errors).toEqual([]);
    expect(exported.meta.fields).toEqual([
      'date',
      'description',
      'amount',
      'type',
      'merchant',
      'category',
      'account',
      'currency',
      'external_id',
      'notes',
    ]);
    const formulaRow = exported.data.find((row) => row.description === "'=1+1");
    expect(formulaRow?.amount).toBe('-5.75');
    expect(formulaRow?.merchant).toBe("'@danger");
  });

  it('backs up before purge and reports the records removed', async () => {
    const result = await service.purgeAllData();
    const recoveryPath = join(
      databaseFile.replace(/[\\/][^\\/]+$/, ''),
      'backups',
      result.recoveryBackup,
    );
    recoveryFiles.push(recoveryPath);
    expect(result.counts.transactions).toBeGreaterThan(0);
    expect(result.counts.accounts).toBeGreaterThan(0);
    expect(existsSync(recoveryPath)).toBe(true);
    for (const table of [
      'transactions',
      'import_batches',
      'rules',
      'categories',
      'accounts',
      'settings',
    ]) {
      expect(
        (sqlite.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number }).count,
      ).toBe(0);
    }
    expect(
      (sqlite.prepare('SELECT COUNT(*) as count FROM schema_migrations').get() as { count: number })
        .count,
    ).toBe(3);
  });
});
