import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

import { env } from '../config/env.js';
import type { Database } from './types.js';

const pool = new Pool({
  host: env.dbHost,
  port: env.dbPort,
  database: env.dbName,
  user: env.dbUser,
  password: env.dbPassword,
  max: 10,
  idleTimeoutMillis: 30_000
});

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool
  })
});

export async function closeDatabase() {
  await db.destroy();
}