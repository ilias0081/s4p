import { z } from 'zod';
import type { Request, Response } from 'express';

export function notAuthenticatedError() {
  return Object.assign(new Error('Not authenticated.'), { code: 'NOT_AUTHENTICATED' });
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