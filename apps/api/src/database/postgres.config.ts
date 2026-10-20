import { config as loadEnvironment } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { Pool, type PoolConfig } from 'pg';

loadEnvironment({ path: fileURLToPath(new URL('../../../../.env', import.meta.url)) });

export function createPostgresPool(overrides: Partial<PoolConfig> = {}): Pool {
  return new Pool({
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    database: process.env.POSTGRES_DB ?? 'livrochat',
    user: process.env.POSTGRES_USER ?? 'livrochat',
    password: process.env.POSTGRES_PASSWORD ?? 'livrochat',
    ...overrides,
  });
}
