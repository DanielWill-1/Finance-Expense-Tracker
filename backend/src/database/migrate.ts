import { sqlite } from './connection';

sqlite.close();
console.log('Migration complete — all tables and indexes created via connection.ts');
