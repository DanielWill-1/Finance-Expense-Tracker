import { sqlite } from './connection';

const seed = () => {
  const now = new Date().toISOString();

  const insert = sqlite.prepare(`
    INSERT OR IGNORE INTO categories (name, type, parent_id, color, icon, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const categories = [
    ['Salary', 'income', null, '#22c55e', 'briefcase', now, now],
    ['Freelance', 'income', null, '#16a34a', 'laptop', now, now],
    ['Investments', 'income', null, '#15803d', 'trending-up', now, now],
    ['Housing', 'expense', null, '#ef4444', 'home', now, now],
    ['Transport', 'expense', null, '#f97316', 'car', now, now],
    ['Food & Dining', 'expense', null, '#eab308', 'utensils', now, now],
    ['Shopping', 'expense', null, '#a855f7', 'shopping-bag', now, now],
    ['Utilities', 'expense', null, '#06b6d4', 'zap', now, now],
    ['Healthcare', 'expense', null, '#ec4899', 'heart', now, now],
    ['Entertainment', 'expense', null, '#f43f5e', 'film', now, now],
    ['Education', 'expense', null, '#8b5cf6', 'book', now, now],
    ['Subscriptions', 'expense', null, '#6366f1', 'repeat', now, now],
    ['Insurance', 'expense', null, '#14b8a6', 'shield', now, now],
    ['Travel', 'expense', null, '#06b6d4', 'plane', now, now],
    ['Miscellaneous', 'expense', null, '#6b7280', 'more-horizontal', now, now],
  ];

  const insertMany = sqlite.transaction(() => {
    for (const cat of categories) {
      insert.run(...cat);
    }
  });

  insertMany();

  const insertAccount = sqlite.prepare(`
    INSERT OR IGNORE INTO accounts (name, type, balance, currency, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const accounts = [
    ['HDFC Savings', 'bank', 50000.0, 'INR', 1, now, now],
    ['ICICI Credit Card', 'card', -2500.0, 'INR', 1, now, now],
    ['Cash Wallet', 'cash', 3000.0, 'INR', 1, now, now],
    ['SBI Salary Account', 'bank', 150000.0, 'INR', 1, now, now],
  ];

  const insertAccounts = sqlite.transaction(() => {
    for (const acct of accounts) {
      insertAccount.run(...acct);
    }
  });

  insertAccounts();

  const insertSetting = sqlite.prepare(`
    INSERT OR IGNORE INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
  `);

  const settings = [
    ['ai_provider', '', now],
    ['ai_model', '', now],
    ['theme', 'dark', now],
    ['currency', 'INR', now],
    ['language', 'en', now],
  ];

  const insertSettings = sqlite.transaction(() => {
    for (const setting of settings) {
      insertSetting.run(...setting);
    }
  });

  insertSettings();

  console.log('Seed data inserted successfully');
  console.log(`  ${categories.length} categories`);
  console.log(`  ${accounts.length} accounts`);
  console.log(`  ${settings.length} settings`);
};

seed();
sqlite.close();
