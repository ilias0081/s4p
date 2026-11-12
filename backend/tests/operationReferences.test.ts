import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import { configurationSchema, referencedOperationIds } from '../src/lib/operationReferences.js';

const operationId = '12345678-1234-4234-8234-123456789abc';
const token = `\${[${operationId}].from.emailAddress.address}`;

test('configuration accepts references while preserving constraints, defaults, and strict keys', () => {
  const original = z.strictObject({
    recipients: z.array(z.email()).min(1),
    body: z.strictObject({ content: z.string().min(1), format: z.enum(['text', 'html']).default('text') }),
    cc: z.array(z.email()).default([]),
  });
  const schema = configurationSchema(original);
  assert.deepEqual(schema.parse({ recipients: [token], body: { content: `Hello ${token}` } }), {
    recipients: [token], body: { content: `Hello ${token}`, format: 'text' }, cc: [],
  });
  assert.equal(original.safeParse({ recipients: [token], body: { content: 'Hello' } }).success, false);
  assert.equal(schema.safeParse({ recipients: ['invalid'], body: { content: 'Hello' } }).success, false);
  assert.equal(schema.safeParse({ recipients: [], body: { content: 'Hello' } }).success, false);
  assert.equal(schema.safeParse({ recipients: [token], body: { content: '' } }).success, false);
  assert.equal(schema.safeParse({ recipients: [token], body: { content: 'Hello', format: token } }).success, false);
  assert.equal(schema.safeParse({ recipients: [token], body: { content: 'Hello' }, extra: true }).success, false);
  assert.deepEqual(referencedOperationIds({ array: [token, `\${[${operationId}].items[0]["odd.key"]}`] }), [operationId, operationId]);
  assert.deepEqual(referencedOperationIds('plain text ${[invalid].field}'), []);
});
