import type { Request, Response } from 'express';

import Outlook from '../apps/outlook/outlook.js';
import {
  matchesClientState, parseNotifications,
} from '../integrations/microsoft_graph/microsoft_graph.js';
import { logger } from '../lib/logger.js';
import { handleError } from '../lib/utils.js';
import { loadApp } from '../services/appService.js';
import { findSubscriptions, matchingTriggers } from '../services/subscriptionService.js';
import { runTriggeredWorkflow } from '../services/workflowExecutionService.js';

const recentDeliveries = new Map<string, number>();

export async function microsoftGraphWebhook(request: Request, response: Response) {
  const validationToken = request.query.validationToken;
  if (typeof validationToken === 'string') {
    response.set('X-Content-Type-Options', 'nosniff').type('text/plain').send(validationToken);
    return;
  }

  const notifications = parseNotifications(request.body);
  if (!notifications) {
    response.sendStatus(400);
    return;
  }

  try {
    const ids = [...new Set(notifications.map((item) => item.subscriptionId))];
    const records = ids.length ? await findSubscriptions('microsoft_graph', ids) : [];
    const subscriptions = new Map(records.map((record) => [record.provider_subscription_id, record]));

    const now = Date.now();
    for (const [key, expiry] of recentDeliveries) {
      if (expiry <= now) recentDeliveries.delete(key);
    }

    response.sendStatus(202);
    for (const notification of notifications) {
      const subscription = subscriptions.get(notification.subscriptionId);
      if (!subscription || notification.changeType !== 'created' ||
        !matchesClientState(subscription.provider_data, notification.clientState)) continue;

      const key = JSON.stringify([notification.subscriptionId, notification.resourceData.id]);
      if (recentDeliveries.has(key)) continue;
      if (recentDeliveries.size >= 10_000) {
        const oldest = recentDeliveries.keys().next();
        if (!oldest.done) recentDeliveries.delete(oldest.value);
      }
      recentDeliveries.set(key, now + 4 * 60 * 60 * 1000);

      void activateWorkflows(subscription, notification.resourceData.id).catch(() => {
        logger.error(new Error('Microsoft Graph webhook dispatch failed.'));
      });
    }
  } catch (error) {
    if (!handleError(error, response)) response.sendStatus(500);
  }
}

async function activateWorkflows(subscription: Awaited<ReturnType<typeof findSubscriptions>>[number], messageId: string) {
  const triggers = await matchingTriggers(subscription.user_id, subscription.app_id, subscription.trigger_method);
  if (!triggers.length) return;

  const app = await loadApp(subscription.app_id);
  if (!(app instanceof Outlook)) throw new Error('Expected Outlook app.');
  const message = await app.getInboxNotificationMessage(subscription.user_id, messageId);
  const runs = await Promise.allSettled(triggers.map((trigger) => runTriggeredWorkflow(subscription.user_id, trigger, message)));
  for (const [index, run] of runs.entries()) {
    if (run.status === 'rejected') {
      const error = run.reason;
      const code = error instanceof Error && 'code' in error ? error.code : 'WORKFLOW_RUN_FAILED';
      logger.error(Object.assign(new Error('Webhook workflow execution failed.'), {
        code, workflowId: triggers[index].workflow_id,
      }));
    }
  }
}
