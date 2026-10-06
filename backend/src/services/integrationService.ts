import { sql } from 'kysely';

import { db } from '../db/database.js';

export type IntegrationListItem = {
  id: string;
  name: string;
  ui_name: string | null;
  is_connected: boolean;
};

export async function getIntegrationsForUser(userId: string): Promise<IntegrationListItem[]> {
  const rows = await db
    .selectFrom('s4p.integrations')
    .select((eb) => [
      's4p.integrations.id',
      's4p.integrations.name',
      's4p.integrations.ui_name',
      eb
        .exists(
          eb
            .selectFrom('s4p.user_integrations')
            .select(sql<number>`1`.as('one'))
            .whereRef('s4p.user_integrations.integration_id', '=', 's4p.integrations.id')
            .where('s4p.user_integrations.user_id', '=', userId)
        )
        .as('is_connected'),
    ])
    .orderBy('is_connected', 'desc')
    .orderBy('s4p.integrations.name', 'asc')
    .execute();

  return rows.map((row) => ({ ...row, is_connected: Boolean(row.is_connected) }));
}
