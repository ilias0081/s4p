import { Router } from 'express';

import {
  deleteWorkflow,
  editWorkflow,
  getWorkflows,
  setWorkflow,
} from '../controllers/dashboardController.js';
import { getIntegrations } from '../controllers/integrationController.js';

const dashboardRouter = Router();

dashboardRouter.get('/workflows', getWorkflows);
dashboardRouter.post('/workflows', setWorkflow);
dashboardRouter.put('/workflows/:workflowId', editWorkflow);
dashboardRouter.delete('/workflows/:workflowId', deleteWorkflow);
dashboardRouter.get('/integrations', getIntegrations);

export { dashboardRouter };
