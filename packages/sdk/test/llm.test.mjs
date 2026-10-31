import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as subpath from '@napplet/sdk/llm';
import * as root from '@napplet/sdk';

const arity = { select: 1, describe: 1, generate: 2, cancel: 1 };

test('root, subpath, aliases and helpers delegate every NAP-LLM operation to the current runtime', () => {
  const previous = globalThis.window;
  try {
    assert.equal(root.llm, subpath.llm);
    assert.equal(root.LLM_DOMAIN, 'llm');
    assert.deepEqual(Object.keys(root.llm).sort(), Object.keys(arity).sort());
    for (const [method, count] of Object.entries(arity)) {
      const args = [{ marker: method }, { onDelta: () => {} }].slice(0, count);
      const result = Promise.resolve({ marker: method });
      const runtime = { [method](...received) { assert.deepEqual(received, args); return result; } };
      globalThis.window = { napplet: { llm: runtime } };
      const helper = `llm${method[0].toUpperCase()}${method.slice(1)}`;
      assert.equal(root.llm[method](...args), result);
      assert.equal(subpath[method](...args), result);
      assert.equal(root[helper](...args), result);
      assert.equal(subpath[helper](...args), result);
      globalThis.window.napplet = {};
      assert.throws(() => subpath.llm[method](...args), /llm.*unavailable/);
    }
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});

test('the llm surface exposes no provider configuration, tool execution, or listeners', () => {
  for (const name of ['configure', 'setApiKey', 'callTool', 'onDelta', 'embed', 'transcribe']) {
    assert.equal(name in root.llm, false, name);
    assert.equal(name in subpath, false, name);
  }
});

test('Failure recognition and the known error code list reach SDK consumers', () => {
  assert.equal(subpath.LLM_ERROR_CODES.length, 8);
  assert.equal(root.isLlmFailure, subpath.isLlmFailure);
  assert.equal(subpath.isLlmFailure(Object.assign(new Error('declined'), { code: 'user-cancelled' })), true);
  assert.equal(subpath.isLlmFailure(Object.assign(new Error('new'), { code: 'future-code' })), true);
  assert.equal(subpath.isLlmFailure(new Error('llm.generate timed out')), false);
});
