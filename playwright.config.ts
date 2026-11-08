import { defineConfig, devices } from '@playwright/test';
import { basename, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const configuredDatabase = process.env.GHOSTLEDGER_E2E_DATABASE;
const expectedDirectory = resolve(process.cwd(), 'backend', 'data');
if (!configuredDatabase)
  throw new Error('Run browser tests with `npm run test:e2e` to create an isolated database');
const databasePath = resolve(configuredDatabase);
const secretDirectory = resolve(tmpdir(), `${basename(databasePath, '.db')}-credentials`);
function testPort(name: string, fallback: string) {
  const value = process.env[name] || fallback;
  if (!/^\d{1,5}$/.test(value) || Number(value) < 1 || Number(value) > 65535)
    throw new Error(`${name} must be a TCP port number`);
  return value;
}
const backendPort = testPort('GHOSTLEDGER_E2E_BACKEND_PORT', '3001');
const frontendPort = testPort('GHOSTLEDGER_E2E_FRONTEND_PORT', '5173');
const fakeAiPort = testPort('GHOSTLEDGER_E2E_FAKE_AI_PORT', '31337');
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
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: backendPort,
  GHOSTLEDGER_E2E_BACKEND_PORT: backendPort,
  GHOSTLEDGER_E2E_FRONTEND_PORT: frontendPort,
  GHOSTLEDGER_E2E_FAKE_AI_PORT: fakeAiPort,
  DATABASE_URL: databasePath,
  ALLOW_REMOTE: 'false',
  OPENAI_API_KEY: '',
  GHOSTLEDGER_SECRET_DIR: secretDirectory,
  AI_TEST_OPENAI_URL: `http://127.0.0.1:${fakeAiPort}/v1/responses`,
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: 'npm run dev --workspace=backend',
      url: `http://127.0.0.1:${backendPort}/api/health`,
      env: serverEnvironment,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npm run dev --workspace=frontend -- --host 127.0.0.1 --strictPort --port ${frontendPort}`,
      url: `http://127.0.0.1:${frontendPort}`,
      env: serverEnvironment,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'node e2e/fake-ai-server.cjs',
      url: `http://127.0.0.1:${fakeAiPort}/health`,
      env: serverEnvironment,
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
