import express from 'express';
import session from 'express-session';

import { env } from './config/env.js';
import './lib/bigintJson.js';
import { issueCsrfToken, verifyCsrfToken } from './middleware/csrf.js';
import { requireAuth } from './middleware/requireAuth.js';
import { authRouter } from './routes/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { healthRouter } from './routes/health.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());
  app.use(
    session({
      secret: env.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.nodeEnv === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7
      }
    })
  );

  app.get('/api/csrf-token', issueCsrfToken);
  app.use('/api', verifyCsrfToken);

  app.use('/api', healthRouter);
  app.use('/api', authRouter);
  app.use('/api', requireAuth, dashboardRouter);

  app.use((_request, response) => {
    response.status(404).json({
      error: 'Not found'
    });
  });

  return app;
}