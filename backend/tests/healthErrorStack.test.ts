import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, rmdir } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createApp } from '../src/app.js';
import { createErrorLogger, logger } from '../src/lib/logger.js';

test('health diagnostic logs the real async service and controller stack', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 's4p-health-stack-'));
  const filename = join(directory, 'error.log');
  const testLogger = createErrorLogger(filename);
  t.mock.method(logger, 'error', (error) => { testLogger.error(error); return logger; });
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/health/test-error`);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'Intentional health test failure.' });
    const finished = once(testLogger, 'finish');
    testLogger.end();
    await finished;
    const entry = JSON.parse((await readFile(filename, 'utf8')).trim());
    assert.equal(entry.code, 'HEALTH_TEST_ERROR');
    assert.ok(entry.stack.includes('throwHealthTestError'));
    assert.ok(entry.stack.includes('testHealthErrorStack'));
    assert.ok(entry.stack.includes('testHealthError'));
    assert.ok(entry.stack.includes('services/healthService.ts'));
    assert.ok(entry.stack.includes('controllers/healthController.ts'));
    assert.equal(entry.stack.includes('node_modules'), false);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    testLogger.close();
    await rm(filename, { force: true });
    await rmdir(directory);
  }
});
