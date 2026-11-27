import { Router } from 'express';

import { microsoftGraphWebhook } from '../controllers/webhookController.js';

const webhookRouter = Router();

webhookRouter.post('/microsoft_graph', microsoftGraphWebhook);

export { webhookRouter };
