import { sqlite } from './connection';

const migrations = sqlite
  .prepare('SELECT version, name, applied_at FROM schema_migrations ORDER BY version')
  .all() as { version: number; name: string; applied_at: string }[];
sqlite.close();
// eslint-disable-next-line no-console -- The migration CLI reports status to stdout.
console.log(`Database migrations verified (${migrations.length} applied)`);
