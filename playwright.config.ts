import { defineConfig, devices } from '@playwright/test';
import { basename, dirname, resolve } from 'node:path';

const configuredDatabase = process.env.GHOSTLEDGER_E2E_DATABASE;
const expectedDirectory = resolve(process.cwd(), 'backend', 'data');
if (!configuredDatabase)
  throw new Error('Run browser tests with `npm run test:e2e` to create an isolated database');
const databasePath = resolve(configuredDatabase);
if (
  dirname(databasePath) !== expectedDirectory ||
  !/^playwright-e2e-[a-f0-9-]+\.db$/i.test(basename(databasePath))
) {
  throw new Error(
    'Refusing to run browser tests against a database outside the dedicated test-data directory',
  );
}

const serverEnvironment = {
  ...process.env,
  NODE_ENV: 'development',
  HOST: '127.0.0.1',
  PORT: '3001',
  DATABASE_URL: databasePath,
  ALLOW_REMOTE: 'false',
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: 'npm run dev --workspace=backend',
      url: 'http://127.0.0.1:3001/api/health',
      env: serverEnvironment,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npm run dev --workspace=frontend -- --host 127.0.0.1 --strictPort',
      url: 'http://127.0.0.1:5173',
      env: serverEnvironment,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
