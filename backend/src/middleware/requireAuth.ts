import type { NextFunction, Request, Response } from 'express';

import { getUserId, handleCommonError } from '../lib/utils.js';

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  try {
    getUserId(request);
    return next();
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to verify session.' });
  }
}
