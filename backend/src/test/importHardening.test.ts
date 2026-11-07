import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type Database from 'better-sqlite3';
import { setupTestDb, teardownTestDb } from './setup';
import type { CSVImportService } from '../services/csvImportService';
import type { RuleRepository } from '../repositories/ruleRepository';

let testDb: ReturnType<typeof setupTestDb>;
let service: CSVImportService;
let rules: RuleRepository;
let sqlite: Database.Database;

beforeAll(async () => {
  testDb = setupTestDb('import-hardening');
  const [{ CSVImportService }, { RuleRepository }, database] = await Promise.all([
    import('../services/csvImportService'),
    import('../repositories/ruleRepository'),
    import('../database/connection'),
  ]);
  service = new CSVImportService();
  rules = new RuleRepository();
  sqlite = database.sqlite;
});

afterAll(async () => {
  await teardownTestDb('import-hardening', testDb);
});

describe('CSV import hardening', () => {
  it('keeps impossible calendar dates in preview with a validation error', () => {
    const preview = service.createPreview(
      'date,description,amount\n2026-02-30,Invalid date,-25',
      'invalid-date.csv',
    );

    expect(preview.validRows).toHaveLength(1);
    expect(preview.validRows[0]?.validationErrors).toContain(
      'Invalid or ambiguous date; use an unambiguous date in YYYY-MM-DD format',
    );
  });

  it('rejects invalid dates at the import commit boundary', () => {
    const preview = service.createPreview(
      'date,description,amount\n2026-02-30,Invalid date,-25',
      'invalid-commit.csv',
    );

    expect(() =>
      service.commitImport(preview.batchId, [
        { date: '2026-02-30', description: 'Invalid date', amount: 25, type: 'expense' },
      ]),
    ).toThrow(/invalid or missing date/i);

    const count = sqlite.prepare('SELECT COUNT(*) as count FROM transactions').get() as {
      count: number;
    };
    expect(count.count).toBe(0);
  });

  it('applies the highest priority persisted rule before committing an uncategorized row', () => {
    const lowPriority = rules.create({ containsText: 'market', categoryId: 3, priority: 1 });
    const highPriority = rules.create({ containsText: 'market', categoryId: 2, priority: 10 });
    expect(
      rules
        .findAllEnabled()
        .slice(0, 2)
        .map((rule) => rule.id),
    ).toEqual([highPriority.id, lowPriority.id]);

    const preview = service.createPreview(
      'date,description,amount\n2026-02-14,Market purchase,-25',
      'rule-import.csv',
    );
    expect(preview.validRows[0]?.suggestedCategoryId).toBe(2);

    service.commitImport(preview.batchId, [
      { date: '2026-02-14', description: 'Market purchase', amount: 25, type: 'expense' },
    ]);

    const saved = sqlite.prepare('SELECT category_id FROM transactions LIMIT 1').get() as {
      category_id: number;
    };
    expect(saved.category_id).toBe(2);
  });

  it('skips within-file and already-imported duplicates unless explicitly kept', () => {
    const csv =
      'date,description,amount\n2026-04-01,Repeat Coffee,-2.50\n2026-04-01,Repeat Coffee,-2.50';
    const preview = service.createPreview(csv, 'duplicates.csv');
    expect(preview.duplicateRows).toBe(1);
    const rows = preview.validRows.map((row) => ({
      date: row.date,
      description: row.description,
      amount: row.amount,
      type: row.type,
    }));
    const firstCommit = service.commitImport(preview.batchId, rows);
    expect(firstCommit).toEqual({ imported: 1, skipped: 1, duplicates: 1 });
    expect(() => service.commitImport(preview.batchId, rows)).toThrow(/already been processed/i);

    const repeatedUpload = service.createPreview(csv, 'duplicates-again.csv');
    expect(repeatedUpload.duplicateRows).toBe(2);
    const repeatedRows = repeatedUpload.validRows.map((row) => ({
      date: row.date,
      description: row.description,
      amount: row.amount,
      type: row.type,
    }));
    expect(service.commitImport(repeatedUpload.batchId, repeatedRows)).toEqual({
      imported: 0,
      skipped: 2,
      duplicates: 2,
    });
    expect(service.getBatchById(repeatedUpload.batchId).skipped_rows).toBe(2);

    const kept = service.createPreview(
      csv.replaceAll('Repeat Coffee', 'Keep Coffee'),
      'keep-duplicate.csv',
    );
    const keptRows = kept.validRows.map((row, index) => ({
      date: row.date,
      description: row.description,
      amount: row.amount,
      type: row.type,
      keepDuplicate: index === 1,
    }));
    expect(service.commitImport(kept.batchId, keptRows)).toEqual({
      imported: 2,
      skipped: 0,
      duplicates: 1,
    });
  });

  it('does not change preview state or insert partial rows when a commit fails', () => {
    const preview = service.createPreview(
      'date,description,amount\n2026-04-05,Atomic commit,-10',
      'atomic.csv',
    );
    const invalidCategory = [
      {
        date: '2026-04-05',
        description: 'Atomic commit',
        amount: 10,
        type: 'expense' as const,
        categoryId: 999999,
      },
    ];
    expect(() => service.commitImport(preview.batchId, invalidCategory)).toThrow();
    expect(service.getBatchById(preview.batchId).status).toBe('preview');
    expect(() =>
      service.commitImport(preview.batchId, [{ ...invalidCategory[0]!, categoryId: null }]),
    ).not.toThrow();
  });

  it('does not allow re-committing an undone batch', () => {
    const preview = service.createPreview(
      'date,description,amount\n2026-04-09,Undo test,-4',
      'undo.csv',
    );
    const rows = preview.validRows.map(({ date, description, amount, type }) => ({
      date,
      description,
      amount,
      type,
    }));
    expect(service.commitImport(preview.batchId, rows).imported).toBe(1);
    expect(service.undoImport(preview.batchId)).toBe(1);
    expect(() => service.commitImport(preview.batchId, rows)).toThrow(/already been processed/i);
  });

  it('rejects missing accounts and categories with a mismatched transaction type', () => {
    const accountBatch = service.createPreview(
      'date,description,amount\n2026-04-10,Account reference,-4',
      'account-reference.csv',
    );
    expect(() =>
      service.commitImport(
        accountBatch.batchId,
        [{ date: '2026-04-10', description: 'Account reference', amount: 4, type: 'expense' }],
        999999,
      ),
    ).toThrow(/account does not exist/i);
    expect(service.getBatchById(accountBatch.batchId).status).toBe('preview');

    const categoryBatch = service.createPreview(
      'date,description,amount\n2026-04-11,Category reference,-4',
      'category-reference.csv',
    );
    expect(() =>
      service.commitImport(categoryBatch.batchId, [
        {
          date: '2026-04-11',
          description: 'Category reference',
          amount: 4,
          type: 'expense',
          categoryId: 1,
        },
      ]),
    ).toThrow(/does not match the transaction type/i);
    expect(service.getBatchById(categoryBatch.batchId).status).toBe('preview');
  });
});
