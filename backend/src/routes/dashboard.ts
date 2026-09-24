import { Router } from 'express';

import {
  deleteWorkflow,
  editWorkflow,
  getWorkflows,
  setWorkflow,
} from '../controllers/dashboardController.js';

const dashboardRouter = Router();

dashboardRouter.get('/workflows', getWorkflows);
dashboardRouter.post('/workflows', setWorkflow);
dashboardRouter.put('/workflows/:workflowId', editWorkflow);
dashboardRouter.delete('/workflows/:workflowId', deleteWorkflow);

export { dashboardRouter };
