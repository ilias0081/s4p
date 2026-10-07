import { sql } from 'kysely';

import { db } from '../db/database.js';
import { createCodeVerifier, type Integration, type IntegrationRecord, type PendingOAuth } from '../lib/integration.js';
import { codedError } from '../lib/utils.js';
import { UUID } from 'crypto';

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

async function loadIntegration(integrationId: string): Promise<Integration> {
  const record: IntegrationRecord | undefined = await db
    .selectFrom('s4p.integrations')
    .select(['id', 'name', 'credentials'])
    .where('id', '=', integrationId)
    .executeTakeFirst();

  if (!record) {
    throw codedError('INTEGRATION_NOT_FOUND', 'Integration not found.');
  }

  // the name becomes part of an import path, so only accept plain identifiers
  if (!/^[a-z0-9_]+$/.test(record.name)) {
    throw codedError('INTEGRATION_NOT_SUPPORTED', `Invalid integration name: ${record.name}`);
  }

  let module: { default: new (record: IntegrationRecord) => Integration };

  try {
    module = await import(`../integrations/${record.name}/${record.name}.ts`);
  } catch {
    throw codedError('INTEGRATION_NOT_SUPPORTED', `No implementation for integration: ${record.name}`);
  }

  return new module.default(record);
}

export async function getIntegrationAuthUrl(
  integrationId: string,
  redirectUri: string
): Promise<{ url: string; codeVerifier?: string }> {
  const integration = await loadIntegration(integrationId);
  const codeVerifier = integration.supportsPkce ? createCodeVerifier() : undefined;

  return { url: integration.getAuthUrl(redirectUri, codeVerifier), codeVerifier };
}

export async function completeIntegrationOAuth(userId: string, pending: PendingOAuth, code: string): Promise<void> {
  const integration = await loadIntegration(pending.integrationId);
  const { tokens, account } = await integration.completeOAuth(code, pending.redirectUri, pending.codeVerifier);

  const values = {
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    access_token_expiry: tokens.expiresAt.toISOString(),
    account_id: account.accountId,
    email: account.email,
  };

  // one row per (user, integration), so reconnecting refreshes the existing row
  await db
    .insertInto('s4p.user_integrations')
    .values({ user_id: userId, integration_id: pending.integrationId, ...values })
    .onConflict((oc) => oc.columns(['integration_id', 'user_id']).doUpdateSet(values))
    .execute();
}

export async function deleteIntegrationForUser(integrationId: string, userId: string) {
  const result = await db
    .deleteFrom('s4p.user_integrations')
    .where('integration_id', '=', integrationId)
    .where('user_id', '=', userId)
    .executeTakeFirst();

  return result.numDeletedRows > 0n;
}