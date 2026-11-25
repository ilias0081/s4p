import { Router } from 'express';

import { getHealth, testHealthError } from '../controllers/healthController.js';
import { env } from '../config/env.js';

const healthRouter = Router();

healthRouter.get('/health', getHealth);
if (env.nodeEnv === 'development') {
  healthRouter.get('/health/test-error', testHealthError);
}

export { healthRouter };
