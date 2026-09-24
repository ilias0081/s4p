import type { Request, Response } from 'express';

import {
  createWorkflow,
  deleteWorkflowForUser,
  getWorkflowsForUser,
  updateWorkflowForUser,
} from '../services/dashboardServices.js';

function parseId(value: string): string | undefined {
  return /^\d+$/.test(value) ? value : undefined;
}

export async function getWorkflows(request: Request, response: Response) {
  const userId = request.session.userId;

  if (!userId) {
    return response.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const workflows = await getWorkflowsForUser(userId);
    return response.status(200).json({ workflows });
  } catch (error) {
    console.error('Get workflows failed:', error);
    return response.status(500).json({ error: 'Unable to fetch workflows.' });
  }
}

export async function setWorkflow(request: Request, response: Response) {
  const userId = request.session.userId;

  if (!userId) {
    return response.status(401).json({ error: 'Not authenticated.' });
  }

  const { name } = request.body ?? {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return response.status(400).json({ error: 'Workflow name is required.' });
  }

  try {
    const workflow = await createWorkflow(userId, name.trim());
    return response.status(201).json({ message: 'Workflow created.', workflow });
  } catch (error) {
    console.error('Set workflow failed:', error);
    return response.status(500).json({ error: 'Unable to create workflow.' });
  }
}

export async function editWorkflow(request: Request, response: Response) {
  const userId = request.session.userId;

  if (!userId) {
    return response.status(401).json({ error: 'Not authenticated.' });
  }

  const workflowId = parseId(request.params.workflowId);

  if (workflowId === undefined) {
    return response.status(400).json({ error: 'Invalid workflow id.' });
  }

  const { name } = request.body ?? {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return response.status(400).json({ error: 'Workflow name is required.' });
  }

  try {
    const workflow = await updateWorkflowForUser(workflowId, userId, name.trim());

    if (!workflow) {
      return response.status(404).json({ error: 'Workflow not found.' });
    }

    return response.status(200).json({ message: 'Workflow updated.', workflow });
  } catch (error) {
    console.error('Edit workflow failed:', error);
    return response.status(500).json({ error: 'Unable to update workflow.' });
  }
}

export async function deleteWorkflow(request: Request, response: Response) {
  const userId = request.session.userId;

  if (!userId) {
    return response.status(401).json({ error: 'Not authenticated.' });
  }

  const workflowId = parseId(request.params.workflowId);

  if (workflowId === undefined) {
    return response.status(400).json({ error: 'Invalid workflow id.' });
  }

  try {
    const wasDeleted = await deleteWorkflowForUser(workflowId, userId);

    if (!wasDeleted) {
      return response.status(404).json({ error: 'Workflow not found.' });
    }

    return response.status(204).send();
  } catch (error) {
    console.error('Delete workflow failed:', error);
    return response.status(500).json({ error: 'Unable to delete workflow.' });
  }
}
