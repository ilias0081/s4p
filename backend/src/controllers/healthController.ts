import type { Request, Response } from 'express';

import { handleCommonError } from '../lib/utils.js';
import { getHealthReport } from '../services/healthService.js';

export async function getHealth(_request: Request, response: Response) {
  try {
    const report = await getHealthReport();

    return response.status(report.status === 'ok' ? 200 : 503).json(report);
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to check health.' });
  }
}