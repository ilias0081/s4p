import { Router } from 'express';
import { updateWorkflowOperation } from '../controllers/workflowEditorController.js';

import { getApps, getAppMethods, getAppMethodInputSchema, getWorkflowOperations, createWorkflowOperation, deleteWorkflowOperation, getReferenceOperations, executeOperation } from '../controllers/workflowEditorController.js';

const workflowEditorRouter = Router();

workflowEditorRouter.get('/workflows/:workflowId/operations', getWorkflowOperations);
workflowEditorRouter.get('/workflows/:workflowId/reference-operations', getReferenceOperations);
workflowEditorRouter.post('/workflows/:workflowId/operations/:operationId/execute', executeOperation);
workflowEditorRouter.get('/apps', getApps);
workflowEditorRouter.get('/apps/:appId/methods', getAppMethods);
workflowEditorRouter.get('/apps/:appId/methods/:method/input-schema', getAppMethodInputSchema);
workflowEditorRouter.post('/workflows/:workflowId/operations', createWorkflowOperation);
workflowEditorRouter.patch('/workflows/:workflowId/operations/:operationId', updateWorkflowOperation);
workflowEditorRouter.delete('/workflows/:workflowId/operations/:operationId', deleteWorkflowOperation);

export { workflowEditorRouter };
