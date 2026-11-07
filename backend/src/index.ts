import app from './app';
import { env } from './config/env';
import { closeDatabase } from './database/connection';
import { logger } from './utils/logger';

const server = app.listen(env.PORT, env.HOST, () => {
  logger.info(`GhostLedger running at http://${env.HOST}:${env.PORT} [${env.NODE_ENV}]`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => {
      closeDatabase();
      process.exit(0);
    });
  });
}
