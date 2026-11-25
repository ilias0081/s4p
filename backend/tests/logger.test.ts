import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createErrorLogger } from '../src/lib/logger.js';

async function captureDeepStack(depth: number): Promise<Error> {
  await Promise.resolve();
  if (depth > 0) return await captureDeepStack(depth - 1);
  return new Error('Deep async stack test.');
}

test('writes JSON errors with application frames and without node_modules frames', async () => {
  const directory = await mkdtemp(join(tmpdir(), 's4p-logger-'));
  const filename = join(directory, 'error.log');
  const logger = createErrorLogger(filename);
  try {
    const error = Object.assign(new Error('External service failed.'), { code: 'EXTERNAL_SERVICE_FAILED' });
    error.stack = [
      'Error: External service failed.',
      '    at Outlook.newEmailInInbox (/app/src/apps/outlook/outlook.ts:58:22)',
      '    at dependency (/app/node_modules/example/index.js:10:2)',
      '    at dependency (C:\\project\\node_modules\\example\\index.js:10:2)',
      '    at executeOperation (/app/src/services/workflowEditorService.ts:66:18)',
    ].join('\n');
    logger.error(error);
    logger.error(await captureDeepStack(20));
    const finished = once(logger, 'finish');
    logger.end();
    await finished;

    const [entry, deepEntry] = (await readFile(filename, 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
    assert.equal(entry.level, 'error');
    assert.equal(entry.code, 'EXTERNAL_SERVICE_FAILED');
    assert.equal(entry.message, 'External service failed.');
    assert.ok(!Number.isNaN(Date.parse(entry.timestamp)));
    assert.ok(entry.stack.includes('Outlook.newEmailInInbox'));
    assert.ok(entry.stack.includes('executeOperation'));
    assert.equal(entry.stack.includes('node_modules'), false);
    assert.equal(deepEntry.message, 'Deep async stack test.');
    assert.ok((deepEntry.stack.match(/captureDeepStack/g) ?? []).length >= 20);
  } finally {
    logger.close();
    await rm(filename, { force: true });
    await rmdir(directory);
  }
});
