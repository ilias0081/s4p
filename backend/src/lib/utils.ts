import { z } from 'zod';
import type { Request, Response } from 'express';

export function notAuthenticatedError() {
  return Object.assign(new Error('Not authenticated.'), { code: 'NOT_AUTHENTICATED' });
}

export function codedError(code: string, message: string) {
  return Object.assign(new Error(message), { code });
}

export function getUserId(request: Request): string {
  const userId = request.session.userId;

  if (!userId) {
    throw notAuthenticatedError();
  }

  return userId;
}

export function validateBody<TSchema extends z.ZodType>(body: unknown, schema: TSchema): z.infer<TSchema> {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw Object.assign(new Error('Request validation failed.'), {
      code: 'SCHEMA_INVALID',
      issues: result.error.issues,
    });
  }

  return result.data;
}

export function handleCommonError(error: unknown, response: Response): Response | undefined {
  if (error instanceof z.ZodError) {
    return response.status(400).json({ error: 'Invalid request.', issues: error.issues });
  }

  if (!error || typeof error !== 'object') {
    console.error('Unhandled controller error:', error);
    return undefined;
  }

  const typedError = error as { code?: string; issues?: z.ZodIssue[] };

  if (typedError.code === 'NOT_AUTHENTICATED') {
    return response.status(401).json({ error: 'Not authenticated.', code: 'NOT_AUTHENTICATED' });
  }

  if (typedError.code === 'INTEGRATION_NOT_FOUND') {
    return response.status(404).json({ error: 'Integration not found.' });
  }

  if (typedError.code === 'INTEGRATION_NOT_SUPPORTED') {
    return response.status(501).json({ error: 'This integration is not supported yet.' });
  }

  if (typedError.code === 'OAUTH_NOT_PENDING') {
    return response.status(400).json({ error: 'No connection is in progress. Start again from the integrations page.' });
  }

  if (typedError.code === 'OAUTH_TOKEN_EXCHANGE_FAILED') {
    return response.status(400).json({ error: 'The provider rejected the authorization code. Please try connecting again.' });
  }

  if (typedError.code === 'SCHEMA_INVALID') {
    return response.status(400).json({ error: 'Invalid request.', issues: typedError.issues });
  }

  if (typedError.code === '23505') {
    return response.status(409).json({ error: 'A resource with these details already exists.' });
  }

  if (typedError.code === '23503') {
    return response.status(409).json({ error: 'The request conflicts with a related resource.' });
  }

  if (typedError.code === '22P02') {
    return response.status(400).json({ error: 'Invalid identifier.' });
  }

  console.error('Unhandled controller error:', error);
  return undefined;
}