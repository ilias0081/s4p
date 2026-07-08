import { sql } from 'kysely';

import { db } from '../db/database.js';

type HealthStatus = 'ok' | 'degraded';
type DatabaseStatus = 'ok' | 'error';

export type HealthReport = {
  status: HealthStatus;
  timestamp: string;
  services: {
    api: 'ok';
    database: DatabaseStatus;
  };
};

export async function getHealthReport(): Promise<HealthReport> {
  try {
    const result = await sql<{ alive: number }>`select 1 as alive`.execute(db);
    const databaseStatus: DatabaseStatus = result.rows[0]?.alive === 1 ? 'ok' : 'error';

    return {
      status: databaseStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        api: 'ok',
        database: databaseStatus
      }
    };
  } catch {
    return {
      status: 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        api: 'ok',
        database: 'error'
      }
    };
  }
}