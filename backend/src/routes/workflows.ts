import { Router } from 'express';

import { getApps, getAppMethods, getWorkflowOperations, createWorkflowOperation, deleteWorkflowOperation } from '../controllers/workflowEditorController.js';

const workflowEditorRouter = Router();

workflowEditorRouter.get('/workflows/:workflowId/operations', getWorkflowOperations);
workflowEditorRouter.get('/apps', getApps);
workflowEditorRouter.get('/apps/:appId/methods', getAppMethods);
workflowEditorRouter.post('/workflows/:workflowId/operations', createWorkflowOperation);
workflowEditorRouter.delete('/workflows/:workflowId/operations/:operationId', deleteWorkflowOperation);

export { workflowEditorRouter };
