import { z } from 'zod';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';

dotenv.config({ path: resolve(dirname(__filename), '../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('./data/ghostledger.db'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
