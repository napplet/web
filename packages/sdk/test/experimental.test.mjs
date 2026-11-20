import { test } from 'node:test';
import assert from 'node:assert/strict';
import { experimentalDomain } from '@napplet/sdk';

test('experimentalDomain returns the runtime-exposed object or undefined when absent', () => {
  const previous = globalThis.window;
  try {
    const mesh = { publish() {} };
    globalThis.window = { napplet: { mesh } };
    assert.equal(experimentalDomain('mesh'), mesh);
    assert.equal(experimentalDomain('other'), undefined);
    assert.equal(experimentalDomain('toString'), undefined);
    globalThis.window = {};
    assert.equal(experimentalDomain('mesh'), undefined);
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});

test('experimentalDomain refuses bundled NAP domains', () => {
  assert.throws(() => experimentalDomain('relay'), /typed SDK wrapper/);
});
