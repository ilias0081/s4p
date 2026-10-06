import type { Request, Response } from 'express';
import { z } from 'zod';

import { getUserId, handleCommonError, validateBody } from '../lib/utils.js';
import {
  createWorkflow,
  deleteWorkflowForUser,
  getWorkflowsForUser,
  updateWorkflowForUser,
} from '../services/dashboardServices.js';

export async function getWorkflows(request: Request, response: Response) {
  try {
    const userId = getUserId(request);
    const workflows = await getWorkflowsForUser(userId);
    return response.status(200).json({ workflows });
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to fetch workflows.' });
  }
}

export async function setWorkflow(request: Request, response: Response) {
  try {
    const userId = getUserId(request);
    const { name } = validateBody(request.body, z.object({
      name: z.string().trim().min(1),
    }));
    const workflow = await createWorkflow(userId, name);
    return response.status(201).json({ message: 'Workflow created.', workflow });
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to create workflow.' });
  }
}

export async function editWorkflow(request: Request, response: Response) {
  try {
    const userId = getUserId(request);
    const { workflowId } = validateBody(request.params, z.object({
      workflowId: z.uuid(),
    }));
    const { name } = validateBody(request.body, z.object({
      name: z.string().trim().min(1),
    }));
    const workflow = await updateWorkflowForUser(
      workflowId,
      userId,
      name
    );

    if (!workflow) {
      return response.status(404).json({ error: 'Workflow not found.' });
    }

    return response.status(200).json({ message: 'Workflow updated.', workflow });
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to update workflow.' });
  }
}

export async function deleteWorkflow(request: Request, response: Response) {
  try {
    const userId = getUserId(request);
    const { workflowId } = validateBody(request.params, z.object({
      workflowId: z.uuid(),
    }));
    const wasDeleted = await deleteWorkflowForUser(workflowId, userId);

    if (!wasDeleted) {
      return response.status(404).json({ error: 'Workflow not found.' });
    }

    return response.status(204).send();
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to delete workflow.' });
  }
}
