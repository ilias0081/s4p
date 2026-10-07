import type { Request, Response } from 'express';
import { z } from 'zod';

import { codedError, getUserId, handleCommonError, validateBody } from '../lib/utils.js';
import {
  completeIntegrationOAuth,
  getIntegrationAuthUrl,
  getIntegrationsForUser,
  deleteIntegrationForUser,
} from '../services/integrationService.js';

export async function getIntegrations(request: Request, response: Response) {
  try {
    const userId = getUserId(request);
    const integrations = await getIntegrationsForUser(userId);
    return response.status(200).json({ integrations });
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to fetch integrations.' });
  }
}

export async function getAuthUrl(request: Request, response: Response) {
  try {
    getUserId(request);
    const { integrationId } = validateBody(request.params, z.object({
      integrationId: z.uuid(),
    }));
    const { redirectUri } = validateBody(request.body, z.object({
      redirectUri: z.url().refine((value) => new URL(value).pathname === '/integration_oauth_callback'),
    }));
    const { url, codeVerifier } = await getIntegrationAuthUrl(integrationId, redirectUri);
    // always overwritten so a verifier or integration from a previous flow can't leak into this one
    request.session.pendingOAuth = { integrationId, redirectUri, codeVerifier };
    return response.status(200).json({ url });
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to build authorization URL.' });
  }
}

export async function completeOAuth(request: Request, response: Response) {
  try {
    const userId = getUserId(request);
    const { code } = validateBody(request.body, z.object({
      code: z.string().min(1),
    }));
    const pending = request.session.pendingOAuth;
    // cleared before use because an authorization code must never be exchanged twice
    request.session.pendingOAuth = undefined;

    if (!pending) {
      throw codedError('OAUTH_NOT_PENDING', 'No connection is in progress.');
    }

    await completeIntegrationOAuth(userId, pending, code);
    return response.status(204).send();
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to complete the connection.' });
  }
}

export async function deleteIntegration(request: Request, response: Response) {
  try {
    const userId = getUserId(request);
    const { integrationId } = validateBody(request.params, z.object({
      integrationId: z.uuid(),
    }));

    const wasDeleted = await deleteIntegrationForUser(integrationId, userId);

    if (!wasDeleted) {
      return response.status(404).json({ error: 'User integration not found.' });
    }

    return response.status(204).send();
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to remove the integration.' });
  }
}