import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').notNull().default('bank'),
  balance: real('balance').notNull().default(0),
  currency: text('currency').notNull().default('INR'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').notNull().default('expense'),
  parentId: integer('parent_id'),
  color: text('color'),
  icon: text('icon'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: real('amount').notNull(),
  date: text('date').notNull(),
  description: text('description').notNull(),
  merchant: text('merchant'),
  categoryId: integer('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  accountId: integer('account_id').references(() => accounts.id, {
    onDelete: 'cascade',
  }),
  type: text('type').notNull().default('expense'),
  importBatchId: integer('import_batch_id'),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).notNull().default(false),
  notes: text('notes'),
  externalId: text('external_id'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const importBatches = sqliteTable('import_batches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  filename: text('filename').notNull(),
  importedAt: text('imported_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  totalRows: integer('total_rows').notNull().default(0),
  importedRows: integer('imported_rows').notNull().default(0),
  skippedRows: integer('skipped_rows').notNull().default(0),
  duplicateRows: integer('duplicate_rows').notNull().default(0),
  status: text('status').notNull().default('completed'),
  parserType: text('parser_type').notNull().default('generic'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const rules = sqliteTable('rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  priority: integer('priority').notNull().default(0),
  containsText: text('contains_text'),
  startsWith: text('starts_with'),
  endsWith: text('ends_with'),
  regex: text('regex'),
  categoryId: integer('category_id').references(() => categories.id, {
    onDelete: 'cascade',
  }),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
