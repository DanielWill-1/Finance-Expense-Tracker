const { randomUUID } = require('node:crypto');
const { existsSync } = require('node:fs');
const { rm, unlink } = require('node:fs/promises');
const { spawn } = require('node:child_process');
const net = require('node:net');
const { tmpdir } = require('node:os');
const { basename, dirname, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const dataDirectory = resolve(root, 'backend', 'data');
const databasePath = resolve(dataDirectory, `playwright-e2e-${randomUUID()}.db`);
const secretDirectory = resolve(tmpdir(), `${basename(databasePath, '.db')}-credentials`);

function testPort(name, value) {
  if (!/^\d{1,5}$/.test(value) || Number(value) < 1 || Number(value) > 65535)
    throw new Error(`${name} must be a TCP port number`);
  return value;
}
if (
  dirname(databasePath) !== dataDirectory ||
  !/^playwright-e2e-[a-f0-9-]+\.db$/i.test(basename(databasePath))
) {
  throw new Error(
    'Refusing to use a browser-test database outside the dedicated test-data directory',
  );
}
if (
  dirname(secretDirectory) !== resolve(tmpdir()) ||
  !/^playwright-e2e-[a-f0-9-]+-credentials$/i.test(basename(secretDirectory))
) {
  throw new Error(
    'Refusing to use a browser-test credential directory outside the system temp directory',
  );
}

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
  await rm(secretDirectory, { recursive: true, force: true });
}

async function availablePorts() {
  const reservations = [];
  try {
    for (let index = 0; index < 3; index++) {
      const server = net.createServer();
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
      });
      reservations.push(server);
    }
    const ports = reservations.map((server) => String(server.address().port));
    await Promise.all(
      reservations.map(
        (server) =>
          new Promise((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
          }),
      ),
    );
    return ports;
  } catch (error) {
    await Promise.all(
      reservations.map((server) => new Promise((resolve) => server.close(resolve))),
    );
    throw error;
  }
}

async function start() {
  const [availableBackend, availableFrontend, availableFakeAi] = await availablePorts();
  const backendPort = testPort(
    'GHOSTLEDGER_E2E_BACKEND_PORT',
    process.env.GHOSTLEDGER_E2E_BACKEND_PORT || availableBackend,
  );
  const frontendPort = testPort(
    'GHOSTLEDGER_E2E_FRONTEND_PORT',
    process.env.GHOSTLEDGER_E2E_FRONTEND_PORT || availableFrontend,
  );
  const fakeAiPort = testPort(
    'GHOSTLEDGER_E2E_FAKE_AI_PORT',
    process.env.GHOSTLEDGER_E2E_FAKE_AI_PORT || availableFakeAi,
  );
  const child = spawn(process.execPath, [require.resolve('@playwright/test/cli'), 'test'], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      HOST: '127.0.0.1',
      PORT: backendPort,
      GHOSTLEDGER_E2E_BACKEND_PORT: backendPort,
      GHOSTLEDGER_E2E_FRONTEND_PORT: frontendPort,
      GHOSTLEDGER_E2E_FAKE_AI_PORT: fakeAiPort,
      DATABASE_URL: databasePath,
      GHOSTLEDGER_E2E_DATABASE: databasePath,
      ALLOW_REMOTE: 'false',
      OPENAI_API_KEY: '',
      GHOSTLEDGER_SECRET_DIR: secretDirectory,
      AI_TEST_OPENAI_URL: `http://127.0.0.1:${fakeAiPort}/v1/responses`,
    },
  });

  child.on('error', async (error) => {
    process.stderr.write(`Could not start Playwright: ${error.message}\n`);
    try {
      await removeTestDatabase();
    } catch (cleanupError) {
      process.stderr.write(
        `Could not remove disposable browser-test data: ${cleanupError.message}\n`,
      );
    }
    process.exitCode = 1;
  });

  child.on('close', async (code) => {
    try {
      await removeTestDatabase();
    } catch (error) {
      process.stderr.write(`Could not remove disposable browser-test data: ${error.message}\n`);
      process.exitCode = 1;
      return;
    }
    process.exitCode = code ?? 1;
  });
}

start().catch(async (error) => {
  process.stderr.write(`Could not start isolated browser tests: ${error.message}\n`);
  try {
    await removeTestDatabase();
  } catch (cleanupError) {
    process.stderr.write(
      `Could not remove disposable browser-test data: ${cleanupError.message}\n`,
    );
  }
  process.exitCode = 1;
});
