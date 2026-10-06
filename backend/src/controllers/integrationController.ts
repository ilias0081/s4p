import type { Request, Response } from 'express';

import { getUserId, handleCommonError } from '../lib/utils.js';
import { getIntegrationsForUser } from '../services/integrationService.js';

export async function getIntegrations(request: Request, response: Response) {
  try {
    const userId = getUserId(request);
    const integrations = await getIntegrationsForUser(userId);
    return response.status(200).json({ integrations });
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to fetch integrations.' });
  }
}
