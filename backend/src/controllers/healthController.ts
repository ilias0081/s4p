import type { Request, Response } from 'express';

import { getHealthReport } from '../services/healthService.js';

export async function getHealth(_request: Request, response: Response) {
  const report = await getHealthReport();

  response.status(report.status === 'ok' ? 200 : 503).json(report);
}