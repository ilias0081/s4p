import { sql, type Transaction } from 'kysely';

import { db } from '../db/database.js';
import type { DB } from '../db/types.js';
import type { App } from '../lib/App.js';
import { codedError } from '../lib/utils.js';

export async function ensureTriggerSubscription(
  trx: Transaction<DB>, app: App, userId: string, appId: string, triggerMethod: string,
) {
  const connection = await trx.selectFrom('s4p.user_integrations as connection')
    .innerJoin('s4p.apps as app', 'app.integration_id', 'connection.integration_id')
    .select('connection.id').where('connection.user_id', '=', userId)
    .where('app.id', '=', appId).executeTakeFirst();
  if (!connection) throw codedError('UI_ERROR', 'Connect this integration before saving the trigger.');

  // Serialize provisioning across workflows without locking the OAuth token row.
  const key = JSON.stringify([connection.id, appId, triggerMethod]);
  await sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`.execute(trx);
  const existing = await trx.selectFrom('s4p.user_integration_subscriptions')
    .select(['id', 'expiry', 'needs_reactivation', 'provider_subscription_id'])
    .where('user_integration_id', '=', connection.id).where('app_id', '=', appId)
    .where('trigger_method', '=', triggerMethod).where('scope', 'is', null).executeTakeFirst();
  if (existing?.provider_subscription_id && existing.expiry > new Date() && !existing.needs_reactivation) return;

  const subscription = await app.createSubscription(triggerMethod, userId);
  const values = {
    provider_subscription_id: subscription.providerSubscriptionId,
    expiry: subscription.expiry,
    provider_data: subscription.providerData,
    needs_reactivation: false,
  };
  if (existing) {
    await trx.updateTable('s4p.user_integration_subscriptions').set(values)
      .where('id', '=', existing.id).execute();
  } else {
    await trx.insertInto('s4p.user_integration_subscriptions').values({
      ...values, user_integration_id: connection.id, app_id: appId,
      trigger_method: triggerMethod, scope: null,
    }).execute();
  }
}

export function findSubscriptions(integrationName: string, providerSubscriptionIds: string[]) {
  return db.selectFrom('s4p.user_integration_subscriptions as subscription')
    .innerJoin('s4p.user_integrations as connection', 'connection.id', 'subscription.user_integration_id')
    .innerJoin('s4p.integrations as integration', 'integration.id', 'connection.integration_id')
    .select(['subscription.provider_subscription_id', 'subscription.app_id', 'subscription.trigger_method',
      'subscription.provider_data', 'connection.user_id'])
    .where('integration.name', '=', integrationName)
    .where('subscription.provider_subscription_id', 'in', providerSubscriptionIds)
    .where('subscription.expiry', '>', new Date())
    .where('subscription.needs_reactivation', '=', false)
    .execute();
}

export function matchingTriggers(userId: string, appId: string, triggerMethod: string) {
  return db.selectFrom('s4p.operations as operation')
    .innerJoin('s4p.workflows as workflow', 'workflow.id', 'operation.workflow_id')
    .selectAll('operation').where('workflow.user_id', '=', userId)
    .where('operation.type', '=', 'trigger').where('operation.previous_operation_id', 'is', null)
    .where('operation.app_id', '=', appId).where('operation.app_method', '=', triggerMethod).execute();
}
