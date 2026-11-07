import { z } from 'zod';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';

const projectRoot = resolve(dirname(__filename), '../../..');
dotenv.config({ path: resolve(projectRoot, '.env') });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().min(1).default('127.0.0.1'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('./data/ghostledger.db'),
  ALLOW_REMOTE: z
    .preprocess((value) => value === true || value === 'true', z.boolean())
    .default(false),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
