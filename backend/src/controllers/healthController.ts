import type { Request, Response } from 'express';

import { handleError } from '../lib/utils.js';
import { getHealthReport, testHealthErrorStack } from '../services/healthService.js';

export async function testHealthError(_request: Request, response: Response) {
  try {
    await testHealthErrorStack();
  } catch (error) {
    return handleError(error, response) ?? response.status(500).json({ error: 'Intentional health test failure.' });
  }
}

export async function getHealth(_request: Request, response: Response) {
  try {
    const report = await getHealthReport();

    return response.status(report.status === 'ok' ? 200 : 503).json(report);
  } catch (error) {
    return handleError(error, response) ?? response.status(500).json({ error: 'Unable to check health.' });
  }
}
