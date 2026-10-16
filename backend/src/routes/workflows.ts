import { Router } from 'express';

import { getApps, getWorkflowOperations } from '../controllers/workflowEditorController.js';

const workflowEditorRouter = Router();

workflowEditorRouter.get('/workflows/:workflowId/operations', getWorkflowOperations);
workflowEditorRouter.get('/apps', getApps);

export { workflowEditorRouter };
