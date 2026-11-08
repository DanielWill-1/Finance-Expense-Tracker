import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const apiBase = `http://127.0.0.1:${process.env.GHOSTLEDGER_E2E_BACKEND_PORT || '3001'}/api`;

async function readApiData<T>(page: Page, endpoint: string): Promise<T> {
  const response = await page.request.get(`${apiBase}${endpoint}`);
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { data: T };
  return payload.data;
}

test('fresh local setup, transaction edits, rule-backed import review, recovery, export, and responsive keyboard use', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  const accountForm = page.locator('form').filter({ has: page.getByLabel('Account name') });
  await page.getByLabel('Account name').fill('E2E Checking');
  await page.getByLabel('Opening/current balance').fill('1250.00');
  await page.getByLabel('Currency code').fill('INR');
  await accountForm.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Account added')).toBeVisible();

  await page.getByRole('button', { name: 'Edit E2E Checking account' }).click();
  await page.getByLabel('Edit E2E Checking account name').fill('E2E Checking Updated');
  await page.getByLabel('Edit E2E Checking balance snapshot').fill('1300.00');
  const editAccountForm = page
    .locator('form')
    .filter({ has: page.getByLabel('Edit E2E Checking account name') });
  await editAccountForm.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Account details and balance snapshot updated.')).toBeVisible();
  await expect(page.getByText(/E2E Checking Updated.*INR 1300\.00/)).toBeVisible();

  const categoryForm = page.locator('form').filter({ has: page.getByLabel('Category name') });
  await page.getByLabel('Category name').fill('Food');
  await page.getByLabel('Category type').selectOption('expense');
  await categoryForm.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Category added')).toBeVisible();

  await page.getByLabel('Category name').fill('Transport');
  await page.getByLabel('Category type').selectOption('expense');
  await categoryForm.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Category added')).toBeVisible();

  await page.getByLabel('Category name').fill('Salary');
  await page.getByLabel('Category type').selectOption('income');
  await categoryForm.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Category added')).toBeVisible();

  const accountRows = await readApiData<Array<{ id: number; name: string }>>(page, '/accounts');
  const accountId = accountRows.find((account) => account.name === 'E2E Checking Updated')?.id;
  expect(accountId).toBeDefined();
  const categories = await readApiData<Array<{ id: number; name: string; type: string }>>(
    page,
    '/categories',
  );
  const food = categories.find((category) => category.name === 'Food');
  const transport = categories.find((category) => category.name === 'Transport');
  const salary = categories.find((category) => category.name === 'Salary');
  expect(food?.id).toBeDefined();
  expect(transport?.id).toBeDefined();
  expect(salary?.id).toBeDefined();

  await page.getByRole('button', { name: 'Rename category Transport' }).click();
  await page.getByLabel('Rename Transport').fill('Transit');
  const renameCategoryForm = page
    .locator('form')
    .filter({ has: page.getByLabel('Rename Transport') });
  await renameCategoryForm.getByRole('button', { name: 'Save' }).click();
  await expect(
    page.getByText('Category renamed. Linked transactions and rules remain attached.'),
  ).toBeVisible();

  const ruleForm = page.locator('form').filter({ has: page.getByLabel('Match value') });
  await page.getByLabel('Match type').selectOption('containsText');
  await page.getByLabel('Match value').fill('Payroll');
  await ruleForm
    .getByRole('combobox', { name: 'Category', exact: true })
    .selectOption(String(salary!.id));
  await page.getByLabel('Priority').fill('20');
  await ruleForm.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Rule saved')).toBeVisible();
  await expect(page.getByText(/contains.*Payroll/i)).toBeVisible();

  await page.getByLabel('Model identifier').fill('local-e2e-model');
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await expect(
    page.getByText('Preferences saved. Saving does not test provider availability.'),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Model identifier')).toHaveValue('local-e2e-model');
  await expect(page.getByText(/contains.*Payroll/i)).toBeVisible();

  await page.getByRole('button', { name: 'Add transaction' }).click();
  const addDialog = page.getByRole('dialog', { name: 'Add Transaction' });
  await expect(addDialog).toBeVisible();
  await expect(addDialog.getByLabel('Date', { exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(addDialog).toHaveCount(0);
  const addTrigger = page.getByRole('button', { name: 'Add transaction' });
  await expect(addTrigger).toBeFocused();

  await addTrigger.click();
  const transactionDialog = page.getByRole('dialog', { name: 'Add Transaction' });
  await transactionDialog.getByLabel('Date', { exact: true }).fill('2026-11-05');
  await transactionDialog.getByLabel('Description').fill('Coffee House');
  await transactionDialog.getByLabel('Amount').fill('12.50');
  await transactionDialog.getByLabel('Merchant').fill('Coffee House');
  await transactionDialog.getByLabel('Category').selectOption(String(food!.id));
  await transactionDialog.getByLabel('Account').selectOption(String(accountId));
  await transactionDialog.getByRole('button', { name: 'Create' }).click();
  await expect(transactionDialog).toHaveCount(0);

  await page.getByRole('link', { name: 'Ledger' }).click();
  const coffeeRow = page.getByRole('row').filter({ hasText: 'Coffee House' });
  await expect(coffeeRow).toContainText('Food');
  await coffeeRow.getByRole('button', { name: 'Edit Coffee House' }).click();
  const editDialog = page.getByRole('dialog', { name: 'Edit Transaction' });
  await editDialog.getByLabel('Category').selectOption(String(transport!.id));
  await editDialog.getByRole('button', { name: 'Update' }).click();
  await expect(editDialog).toHaveCount(0);
  await expect(coffeeRow).toContainText('Transit');

  await page.getByLabel('Filter by account').selectOption(String(accountId));
  await page.getByLabel('Filter by transaction type').selectOption('expense');
  await page.getByLabel('Filter start date').fill('2026-11-05');
  await page.getByLabel('Filter end date').fill('2026-11-05');
  await page.getByLabel('Sort ledger by').selectOption('amount');
  await page.getByLabel('Sort order').selectOption('asc');
  await expect(coffeeRow).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'E2E delete me' })).toHaveCount(0);
  await page.getByLabel('Filter by account').selectOption('');
  await page.getByLabel('Filter by transaction type').selectOption('');
  await page.getByLabel('Filter start date').fill('');
  await page.getByLabel('Filter end date').fill('');
  await page.getByLabel('Sort ledger by').selectOption('date');
  await page.getByLabel('Sort order').selectOption('desc');

  await addTrigger.click();
  const deleteDialog = page.getByRole('dialog', { name: 'Add Transaction' });
  await deleteDialog.getByLabel('Date', { exact: true }).fill('2026-11-06');
  await deleteDialog.getByLabel('Description').fill('E2E delete me');
  await deleteDialog.getByLabel('Amount').fill('5.00');
  await deleteDialog.getByLabel('Category').selectOption(String(food!.id));
  await deleteDialog.getByLabel('Account').selectOption(String(accountId));
  await deleteDialog.getByRole('button', { name: 'Create' }).click();
  const deleteRow = page.getByRole('row').filter({ hasText: 'E2E delete me' });
  await expect(deleteRow).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await deleteRow.getByRole('button', { name: 'Delete E2E delete me' }).click();
  await expect(deleteRow).toHaveCount(0);

  await page
    .getByLabel('Choose CSV file')
    .setInputFiles(resolve(process.cwd(), 'docs', 'examples', 'generic-synthetic.csv'));
  const importDialog = page.getByRole('dialog', { name: 'Import Transactions' });
  await expect(importDialog).toBeVisible();
  const accountSelect = importDialog.getByLabel('Account');
  await accountSelect.selectOption(String(accountId));
  const payrollCategory = importDialog.getByLabel('Category for CSV row 2');
  await expect(payrollCategory).toHaveValue(String(salary!.id));
  await expect(importDialog.getByText('Keep duplicate')).toBeVisible();
  await importDialog.getByLabel('Keep duplicate').check();
  await importDialog.getByRole('button', { name: 'Import Transactions' }).click();
  await expect(importDialog.getByText('Imported 2, skipped 0, duplicate matches 1.')).toBeVisible();
  await importDialog.getByRole('button', { name: 'Close', exact: true }).click();

  const historyRow = page.getByRole('row').filter({ hasText: 'generic-synthetic.csv' });
  await expect(historyRow).toHaveCount(1);
  await expect(historyRow).toContainText('2 / 2');
  await historyRow.getByRole('button', { name: 'Undo import generic-synthetic.csv' }).click();
  await expect(historyRow).toContainText('rolled_back');
  await expect(page.getByRole('row').filter({ hasText: 'Coffee House' })).toHaveCount(1);
  await expect(page.getByRole('row').filter({ hasText: 'Payroll' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Add transaction' }).click();
  const formulaDialog = page.getByRole('dialog', { name: 'Add Transaction' });
  await formulaDialog.getByLabel('Date', { exact: true }).fill('2026-11-07');
  await formulaDialog.getByLabel('Description').fill('=SUM(1,2)');
  await formulaDialog.getByLabel('Amount').fill('3.00');
  await formulaDialog.getByLabel('Category').selectOption(String(food!.id));
  await formulaDialog.getByLabel('Account').selectOption(String(accountId));
  await formulaDialog.getByRole('button', { name: 'Create' }).click();

  const exportDownloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Export transactions CSV' }).click();
  const exportDownload = await exportDownloadPromise;
  const exportPath = await exportDownload.path();
  expect(exportPath).toBeTruthy();
  const csv = await readFile(exportPath!, 'utf8');
  expect(csv).toContain("'=SUM(1,2)");
  expect(csv).toContain('Coffee House');

  const backupDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download database backup' }).click();
  const backupDownload = await backupDownloadPromise;
  const backupPath = await backupDownload.path();
  expect(backupPath).toBeTruthy();

  await page.getByRole('button', { name: 'Add transaction' }).click();
  const postBackupDialog = page.getByRole('dialog', { name: 'Add Transaction' });
  await postBackupDialog.getByLabel('Date', { exact: true }).fill('2026-11-07');
  await postBackupDialog.getByLabel('Description').fill('After backup sentinel');
  await postBackupDialog.getByLabel('Amount').fill('1.00');
  await postBackupDialog.getByLabel('Category').selectOption(String(food!.id));
  await postBackupDialog.getByLabel('Account').selectOption(String(accountId));
  await postBackupDialog.getByRole('button', { name: 'Create' }).click();

  await page.getByLabel('Choose GhostLedger database backup').setInputFiles({
    name: 'ghostledger-e2e-backup.db',
    mimeType: 'application/octet-stream',
    buffer: await readFile(backupPath!),
  });
  await expect(page.getByRole('status').filter({ hasText: 'Restored database.' })).toBeVisible();
  await page.getByRole('link', { name: 'Ledger' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Coffee House' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: '=SUM(1,2)' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'After backup sentinel' })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('link', { name: 'Ledger' })).toBeVisible();
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(horizontalOverflow).toBeFalsy();
  await page.getByRole('link', { name: 'Settings' }).focus();
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).not.toBeEmpty();

  await testInfo.attach('synthetic-workflow', {
    body: Buffer.from(
      'Browser scenario used a disposable SQLite database and synthetic CSV records only.',
    ),
    contentType: 'text/plain',
  });
});

test('AI setup, suggested prompt, streaming, retry, cancellation, and local history use a synthetic provider', async ({
  page,
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const accountResponse = await page.request.post(`${apiBase}/accounts`, {
    data: { name: 'Assistant E2E Account', type: 'bank', balance: 0, currency: 'INR' },
  });
  expect(accountResponse.ok()).toBeTruthy();
  const account = (await accountResponse.json()).data as { id: number };
  const categoryResponse = await page.request.post(`${apiBase}/categories`, {
    data: { name: 'Assistant E2E Dining', type: 'expense' },
  });
  expect(categoryResponse.ok()).toBeTruthy();
  const category = (await categoryResponse.json()).data as { id: number };
  const transactionResponse = await page.request.post(`${apiBase}/transactions`, {
    data: {
      amount: 37.25,
      date: today,
      description: 'Synthetic dinner',
      merchant: 'Synthetic Cafe',
      categoryId: category.id,
      accountId: account.id,
      type: 'expense',
    },
  });
  expect(transactionResponse.ok()).toBeTruthy();

  await page.goto('/settings');
  await page.getByLabel('Provider and destination').selectOption('openai');
  await page.getByLabel('Model identifier').fill('e2e-fake-model');
  await page.getByLabel(/Enable AI analysis/).check();
  await page.getByLabel(/I consent to send my question/).check();
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await expect(
    page.getByText('Preferences saved. Saving does not test provider availability.'),
  ).toBeVisible();
  const syntheticKey = 'synthetic-settings-key-e2e-only';
  await page.getByLabel('OpenAI API key').fill(syntheticKey);
  await page.getByRole('button', { name: 'Save API key' }).click();
  await expect(page.getByText('API key saved. It cannot be viewed after saving.')).toBeVisible();
  await expect(page.getByLabel('OpenAI API key')).toHaveValue('');
  const credentialStatus = await readApiData<{
    provider: string;
    configured: boolean;
    source: string;
  }>(page, '/assistant/credentials/openai');
  expect(credentialStatus).toEqual({ provider: 'openai', configured: true, source: 'settings' });
  expect(JSON.stringify(credentialStatus)).not.toContain(syntheticKey);
  await page.getByRole('button', { name: 'Test connection' }).click();
  await expect(page.getByText('Connection test passed. No ledger data was sent.')).toBeVisible();

  await page.goto('/assistant');
  await page.getByRole('button', { name: 'Spending' }).click();
  await expect(
    page.getByText(/Synthetic provider used ledger context: INR [\d.]+ expenses/),
  ).toBeVisible();
  await expect(page.getByText(/Period:/)).toBeVisible();
  await page.getByText(/Ledger evidence \(\d+ transaction references\)/).click();
  await expect(page.getByText(/Synthetic dinner/)).toBeVisible();
  await expect(page.getByText(/Calculated totals by currency/)).toBeVisible();
  await page.reload();
  await expect(
    page.getByText(/Synthetic provider used ledger context: INR [\d.]+ expenses/),
  ).toBeVisible();

  const input = page.getByLabel('Ask Ghost AI about your ledger');
  await input.fill('retry this request');
  await page.getByRole('button', { name: 'Send question to Ghost AI' }).click();
  await expect(page.getByText('Analysis failed')).toBeVisible();
  await page.getByRole('button', { name: 'Retry' }).last().click();
  await expect(page.getByText(/Synthetic provider used ledger context:/).last()).toBeVisible();

  await input.fill('cancel this request');
  await page.getByRole('button', { name: 'Send question to Ghost AI' }).click();
  await page.getByRole('button', { name: 'Stop assistant response' }).click();
  await expect(page.getByText('Cancelled').last()).toBeVisible();
  await page.getByRole('button', { name: 'Clear local chat history' }).click();
  await expect(page.getByText(/Synthetic provider used ledger context:/)).toHaveCount(0);
  await expect(page.getByLabel('Ask Ghost AI about your ledger')).toHaveValue('');
});
