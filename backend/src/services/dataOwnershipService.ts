import Database from 'better-sqlite3';
import Papa from 'papaparse';
import { chmodSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs';
import { chmod } from 'fs/promises';
import { tmpdir } from 'os';
import { basename, dirname, join } from 'path';
import { randomUUID } from 'crypto';
import { databasePath } from '../database/connection';
import { CURRENT_SCHEMA_VERSION } from '../database/migrations';
import { DatabaseRepository } from '../repositories/databaseRepository';
import { TransactionRepository } from '../repositories/transactionRepository';
import { ConflictError, ValidationError } from '../utils/errors';

const recoveryPrefix = 'ghostledger-recovery-';
const sensitiveSettingKey = /(?:api[_-]?key|secret|token|credential|password)/i;
const exportColumns = [
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
];

function formulaSafe(value: string | null): string {
  const text = value ?? '';
  return /^[ \t\r\n]*[=+\-@]/.test(text) ? `'${text}` : text;
}

export class DataOwnershipService {
  private databaseRepo = new DatabaseRepository();
  private transactionRepo = new TransactionRepository();

  async createDownloadBackup(): Promise<string> {
    const filePath = join(tmpdir(), `ghostledger-backup-${randomUUID()}.db`);
    try {
      await this.databaseRepo.backup(filePath);
      await chmod(filePath, 0o600);
      return filePath;
    } catch {
      this.removeFile(filePath);
      throw new ConflictError('Database backup could not be created');
    }
  }

  async restoreFrom(filePath: string): Promise<string> {
    this.validateBackup(filePath);
    const recoveryPath = await this.createRecoveryBackup();
    try {
      this.databaseRepo.replaceDataFrom(filePath);
      return basename(recoveryPath);
    } catch {
      throw new ConflictError(
        `Restore failed. The current database is unchanged; recovery backup saved as ${basename(recoveryPath)}.`,
      );
    }
  }

  async purgeAllData(): Promise<{
    counts: ReturnType<DatabaseRepository['purge']>;
    recoveryBackup: string;
  }> {
    const recoveryPath = await this.createRecoveryBackup();
    try {
      const counts = this.databaseRepo.purge();
      return { counts, recoveryBackup: basename(recoveryPath) };
    } catch {
      throw new ConflictError(
        `Purge failed. The current database is unchanged; recovery backup saved as ${basename(recoveryPath)}.`,
      );
    }
  }

  exportTransactionsCSV(): string {
    const transactions: ReturnType<TransactionRepository['findAllForExport']>['data'] = [];
    const pageSize = 1000;
    let page = 1;
    let total = 0;
    do {
      const batch = this.transactionRepo.findAllForExport(page, pageSize);
      transactions.push(...batch.data);
      total = batch.total;
      page++;
    } while (transactions.length < total);

    const rows = transactions.map((transaction) => ({
      date: transaction.date,
      description: formulaSafe(transaction.description),
      amount: transaction.type === 'expense' ? -transaction.amount : transaction.amount,
      type: transaction.type,
      merchant: formulaSafe(transaction.merchant),
      category: formulaSafe(transaction.category_name ?? null),
      account: formulaSafe(transaction.account_name ?? null),
      currency: transaction.account_currency ?? 'INR',
      external_id: formulaSafe(transaction.external_id),
      notes: formulaSafe(transaction.notes),
    }));
    return Papa.unparse(rows, { columns: exportColumns, quotes: true, newline: '\r\n' });
  }

  private async createRecoveryBackup(): Promise<string> {
    const directory = join(dirname(databasePath), 'backups');
    if (!existsSync(directory)) mkdirSync(directory, { recursive: true, mode: 0o700 });
    try {
      chmodSync(directory, 0o700);
    } catch {
      /* Windows ACLs govern directory access on Windows. */
    }
    const time = new Date().toISOString().replace(/[:.]/g, '-');
    const destination = join(directory, `${recoveryPrefix}${time}-${randomUUID().slice(0, 8)}.db`);
    try {
      await this.databaseRepo.backup(destination);
      await chmod(destination, 0o600);
      this.pruneRecoveryBackups(directory);
      return destination;
    } catch {
      this.removeFile(destination);
      throw new ConflictError('Could not create the required recovery backup; no data was changed');
    }
  }

  private validateBackup(filePath: string): void {
    if (!existsSync(filePath) || statSync(filePath).size === 0)
      throw new ValidationError('Backup file is empty or missing');
    let candidate: Database.Database | undefined;
    try {
      candidate = new Database(filePath, { readonly: true, fileMustExist: true });
      const integrity = candidate.pragma('integrity_check') as { integrity_check: string }[];
      if (integrity.length !== 1 || integrity[0]?.integrity_check !== 'ok')
        throw new Error('integrity');
      const version = candidate
        .prepare('SELECT MAX(version) as version FROM schema_migrations')
        .get() as { version: number | null };
      if (version.version !== CURRENT_SCHEMA_VERSION) throw new Error('version');
      const schemaColumns: Record<string, string[]> = {
        accounts: [
          'id',
          'name',
          'type',
          'balance',
          'currency',
          'is_active',
          'created_at',
          'updated_at',
        ],
        categories: [
          'id',
          'name',
          'type',
          'parent_id',
          'color',
          'icon',
          'created_at',
          'updated_at',
        ],
        transactions: [
          'id',
          'amount',
          'date',
          'description',
          'merchant',
          'category_id',
          'account_id',
          'type',
          'import_batch_id',
          'is_recurring',
          'notes',
          'external_id',
          'created_at',
          'updated_at',
        ],
        import_batches: [
          'id',
          'filename',
          'imported_at',
          'total_rows',
          'imported_rows',
          'skipped_rows',
          'duplicate_rows',
          'status',
          'parser_type',
          'created_at',
        ],
        rules: [
          'id',
          'priority',
          'contains_text',
          'starts_with',
          'ends_with',
          'regex',
          'category_id',
          'enabled',
          'created_at',
        ],
        settings: ['id', 'key', 'value', 'updated_at'],
      };
      for (const [table, expected] of Object.entries(schemaColumns)) {
        const actual = (candidate.pragma(`table_info(${table})`) as { name: string }[]).map(
          (column) => column.name,
        );
        if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('schema');
      }
      if ((candidate.pragma('foreign_key_check') as unknown[]).length)
        throw new Error('foreign keys');
      const settingKeys = candidate.prepare('SELECT key FROM settings').all() as { key: string }[];
      if (settingKeys.some(({ key }) => sensitiveSettingKey.test(key)))
        throw new Error('secret settings');
    } catch {
      throw new ValidationError(
        'This file is not a valid GhostLedger backup from the current schema version',
      );
    } finally {
      candidate?.close();
    }
  }

  private pruneRecoveryBackups(directory: string): void {
    const files = readdirSync(directory)
      .filter((name) => name.startsWith(recoveryPrefix) && name.endsWith('.db'))
      .map((name) => ({ name, modified: statSync(join(directory, name)).mtimeMs }))
      .sort((a, b) => b.modified - a.modified);
    for (const file of files.slice(10)) this.removeFile(join(directory, file.name));
  }

  private removeFile(filePath: string): void {
    try {
      rmSync(filePath, { force: true });
    } catch {
      /* best-effort temporary-file cleanup */
    }
  }
}
