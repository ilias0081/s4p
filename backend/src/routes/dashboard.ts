import { Router } from 'express';

import {
  deleteWorkflow,
  editWorkflow,
  getWorkflows,
  setWorkflow,
} from '../controllers/dashboardController.js';
import { 
  completeOAuth, 
  getAuthUrl, 
  getIntegrations,
  deleteIntegration
} from '../controllers/integrationController.js';

const dashboardRouter = Router();

dashboardRouter.get('/workflows', getWorkflows);
dashboardRouter.post('/workflows', setWorkflow);
dashboardRouter.put('/workflows/:workflowId', editWorkflow);
dashboardRouter.delete('/workflows/:workflowId', deleteWorkflow);

dashboardRouter.get('/integrations', getIntegrations);
dashboardRouter.post('/integrations/:integrationId/auth-url', getAuthUrl);
dashboardRouter.delete('/integrations/:integrationId/delete', deleteIntegration);
dashboardRouter.post('/integrations/oauth-callback', completeOAuth);

export { dashboardRouter };
