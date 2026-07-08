import express from 'express';

import { healthRouter } from './routes/health.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  app.use('/api', healthRouter);

  app.use((_request, response) => {
    response.status(404).json({
      error: 'Not found'
    });
  });

  return app;
}