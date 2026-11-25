import assert from 'node:assert/strict';
import test from 'node:test';
import type { Response } from 'express';
import { codedError, handleError } from '../src/lib/utils.js';
import { logger } from '../src/lib/logger.js';

test('UI_ERROR returns its exact message and a code the frontend can recognize', () => {
  const message = 'Reconnect Microsoft before continuing.\nYour existing configuration is saved.';
  let status: number | undefined;
  let body: unknown;
  const response = {
    status(value: number) { status = value; return this; },
    json(value: unknown) { body = value; return this; },
  } as Response;

  assert.equal(handleError(codedError('UI_ERROR', message), response), response);
  assert.equal(status, 400);
  assert.deepEqual(body, { code: 'UI_ERROR', error: message });
});

test('external failures preserve their codes but expose only a translated message', (t) => {
  const log = t.mock.method(logger, 'error', () => logger);
  for (const code of ['OAUTH_TOKEN_EXCHANGE_FAILED', 'OAUTH_ACCOUNT_LOOKUP_FAILED', 'OAUTH_TOKEN_REFRESH_FAILED',
    'OAUTH_TOKEN_RESPONSE_INVALID', 'EXTERNAL_SERVICE_FAILED', 'EXTERNAL_SERVICE_TIMEOUT']) {
    const internalMessage = 'Microsoft issued tokens, but /me failed with diagnostic details.';
    let status: number | undefined;
    let body: unknown;
    const response = {
      status(value: number) { status = value; return this; },
      json(value: unknown) { body = value; return this; },
    } as Response;
    handleError(codedError(code, internalMessage), response);
    assert.equal(status, code === 'EXTERNAL_SERVICE_TIMEOUT' ? 504 : 502);
    assert.deepEqual(body, { code, error: 'External service failed. Please try again later.' });
    assert.equal(JSON.stringify(body).includes(internalMessage), false);
  }
  assert.equal(log.mock.callCount(), 6);
});
