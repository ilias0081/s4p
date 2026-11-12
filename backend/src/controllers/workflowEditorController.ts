import type { Request, Response } from 'express';
import { z } from 'zod';

import { getUserId, handleCommonError, validateBody } from '../lib/utils.js';
import {
  getApps as fetchApps, getWorkflowOperations as fetchWorkflowOperations,
  getAppMethods as fetchAppMethods, createWorkflowOperation as saveWorkflowOperation,
  deleteWorkflowOperation as removeWorkflowOperation,
  getAppMethodInputSchema as fetchAppMethodInputSchema,
  getReferenceOperations as fetchReferenceOperations, executeOperation as runOperation,
  updateWorkflowOperation as editWorkflowOperation,
} from '../services/workflowEditorService.js';

export async function updateWorkflowOperation(request: Request, response: Response) {
  try {
    const userId = getUserId(request);
    const { workflowId, operationId } = validateBody(request.params, z.object({ workflowId: z.uuid(), operationId: z.uuid() }));
    const input = validateBody(request.body, z.strictObject({
      appId: z.uuid(), method: z.string().min(1), type: z.enum(['trigger', 'action_in_app']),
      configuration: z.record(z.string(), z.unknown()),
    }));
    return response.json({ operation: await editWorkflowOperation(userId, workflowId, operationId, input) });
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to update operation.' });
  }
}

export async function getReferenceOperations(request: Request, response: Response) {
  try {
    const userId = getUserId(request);
    const { workflowId } = validateBody(request.params, z.object({ workflowId: z.uuid() }));
    const { sourceId } = validateBody(request.query, z.object({ sourceId: z.uuid() }));
    return response.json({ operations: await fetchReferenceOperations(userId, workflowId, sourceId) });
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to load preceding operations.' });
  }
}

export async function executeOperation(request: Request, response: Response) {
  try {
    const userId = getUserId(request);
    const { workflowId, operationId } = validateBody(request.params, z.object({ workflowId: z.uuid(), operationId: z.uuid() }));
    const { sourceId } = validateBody(request.body, z.strictObject({ sourceId: z.uuid() }));
    const cache = request.session.operationOutputs ?? {};
    const result = await runOperation(userId, workflowId, operationId, sourceId, cache);
    request.session.operationOutputs = cache;
    response.setHeader('Cache-Control', 'no-store');
    return response.json(result);
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to preview operation.' });
  }
}

export async function getAppMethodInputSchema(request: Request, response: Response) {
  try {
    getUserId(request);
    const { appId, method } = validateBody(request.params, z.object({ appId: z.uuid(), method: z.string().min(1) }));
    return response.json({ schema: await fetchAppMethodInputSchema(appId, method) });
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to load method configuration.' });
  }
}

export async function deleteWorkflowOperation(request: Request, response: Response) {
  try {
    const userId = getUserId(request);
    const { workflowId, operationId } = validateBody(request.params, z.object({ workflowId: z.uuid(), operationId: z.uuid() }));
    await removeWorkflowOperation(userId, workflowId, operationId);
    return response.status(204).send();
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to delete operation.' });
  }
}

export async function getAppMethods(request: Request, response: Response) {
  try {
    getUserId(request);
    const { appId } = validateBody(request.params, z.object({ appId: z.uuid() }));
    const { type } = validateBody(request.query, z.object({ type: z.enum(['trigger', 'action_in_app']) }));
    return response.json({ methods: await fetchAppMethods(appId, type) });
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to load app methods.' });
  }
}

export async function createWorkflowOperation(request: Request, response: Response) {
  try {
    const userId = getUserId(request);
    const { workflowId } = validateBody(request.params, z.object({ workflowId: z.uuid() }));
    const input = validateBody(request.body, z.strictObject({
      appId: z.uuid(),
      method: z.string().min(1),
      type: z.enum(['trigger', 'action_in_app']),
      configuration: z.record(z.string(), z.unknown()).optional(),
      position: z.strictObject({ sourceId: z.uuid(), branch: z.enum(['true', 'false']), targetId: z.uuid().nullable() }).optional(),
    }));
    const operation = await saveWorkflowOperation(userId, workflowId, input);
    return response.status(201).json({ operation });
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to save operation.' });
  }
}

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
