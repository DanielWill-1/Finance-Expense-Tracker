const { randomUUID } = require('node:crypto');
const { existsSync } = require('node:fs');
const { unlink } = require('node:fs/promises');
const { spawn } = require('node:child_process');
const { basename, dirname, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const dataDirectory = resolve(root, 'backend', 'data');
const databasePath = resolve(dataDirectory, `playwright-e2e-${randomUUID()}.db`);
if (dirname(databasePath) !== dataDirectory || !/^playwright-e2e-[a-f0-9-]+\.db$/i.test(basename(databasePath))) {
  throw new Error('Refusing to use a browser-test database outside the dedicated test-data directory');
}

const child = spawn(process.execPath, [require.resolve('@playwright/test/cli'), 'test'], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    HOST: '127.0.0.1',
    PORT: '3001',
    DATABASE_URL: databasePath,
    GHOSTLEDGER_E2E_DATABASE: databasePath,
    ALLOW_REMOTE: 'false',
  },
});

async function removeTestDatabase() {
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    const file = `${databasePath}${suffix}`;
    if (!existsSync(file)) continue;
    let lastError;
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        await unlink(file);
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        if (error.code !== 'EBUSY' && error.code !== 'EPERM') break;
        await new Promise((done) => setTimeout(done, 100));
      }
    }
    if (lastError) throw lastError;
  }
}

child.on('error', async (error) => {
  process.stderr.write(`Could not start Playwright: ${error.message}\n`);
  try {
    await removeTestDatabase();
  } catch (cleanupError) {
    process.stderr.write(`Could not remove disposable browser-test database: ${cleanupError.message}\n`);
  }
  process.exitCode = 1;
});

child.on('close', async (code) => {
  try {
    await removeTestDatabase();
  } catch (error) {
    process.stderr.write(`Could not remove disposable browser-test database: ${error.message}\n`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
