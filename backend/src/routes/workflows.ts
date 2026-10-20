import { Router } from 'express';

import { getApps, getAppMethods, getWorkflowOperations, createWorkflowOperation } from '../controllers/workflowEditorController.js';

const workflowEditorRouter = Router();

workflowEditorRouter.get('/workflows/:workflowId/operations', getWorkflowOperations);
workflowEditorRouter.get('/apps', getApps);
workflowEditorRouter.get('/apps/:appId/methods', getAppMethods);
workflowEditorRouter.post('/workflows/:workflowId/operations', createWorkflowOperation);

export { workflowEditorRouter };
