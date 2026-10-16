import type { Request, Response } from 'express';
import { z } from 'zod';

import { getUserId, handleCommonError, validateBody } from '../lib/utils.js';
import { getApps as fetchApps, getWorkflowOperations as fetchWorkflowOperations } from '../services/workflowEditorService.js';

export async function getApps(request: Request, response: Response) {
  try {
    getUserId(request);
    const apps = await fetchApps();
    return response.json({ apps });
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to load apps.' });
  }
}

export async function getWorkflowOperations(request: Request, response: Response) {
  try {
    const userId = getUserId(request);
    const { workflowId } = validateBody(request.params, z.object({ workflowId: z.uuid() }));

    const operations = await fetchWorkflowOperations(userId, workflowId);
    if (!operations) return response.status(404).json({ error: 'Workflow not found.' });
    
    return response.json({ operations });
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to load operations.' });
  }
}
