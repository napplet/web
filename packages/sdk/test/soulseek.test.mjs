import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as subpath from '@napplet/sdk/soulseek';
import * as root from '@napplet/sdk';

const arity = {
  info: 0, search: 1, browse: 1, results: 3, stop: 1, download: 1, transfers: 0,
  status: 1, pause: 1, resume: 1, cancel: 1, read: 3, save: 1, release: 2,
};

test('root, subpath, aliases and helpers delegate every NAP-SOULSEEK operation to the current runtime', () => {
  const previous = globalThis.window;
  try {
    assert.equal(root.soulseek, subpath.soulseek);
    assert.equal(root.SOULSEEK_DOMAIN, 'soulseek');
    assert.deepEqual(Object.keys(root.soulseek).sort(), Object.keys(arity).sort());
    for (const [method, count] of Object.entries(arity)) {
      const args = [{ marker: method }, 7, 'third'].slice(0, count);
      const result = Promise.resolve({ marker: method });
      const runtime = { [method](...received) { assert.deepEqual(received, args); return result; } };
      globalThis.window = { napplet: { soulseek: runtime } };
      const helper = `soulseek${method[0].toUpperCase()}${method.slice(1)}`;
      assert.equal(root.soulseek[method](...args), result);
      assert.equal(subpath[method](...args), result);
      assert.equal(root[helper](...args), result);
      assert.equal(subpath[helper](...args), result);
      globalThis.window.napplet = {};
      assert.throws(() => subpath.soulseek[method](...args), /soulseek.*unavailable/);
    }
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});

test('the soulseek surface exposes no listeners, pushes, or account administration', () => {
  for (const name of ['onState', 'onProgress', 'onError', 'login', 'chat', 'share', 'upload']) {
    assert.equal(name in root.soulseek, false, name);
    assert.equal(name in subpath, false, name);
  }
});

test('Failure recognition and the closed error code set reach SDK consumers', () => {
  assert.equal(subpath.SOULSEEK_ERROR_CODES.length, 14);
  assert.equal(root.isSoulseekFailure, subpath.isSoulseekFailure);
  assert.equal(subpath.isSoulseekFailure(Object.assign(new Error('refused'), { code: 'peer_denied' })), true);
  assert.equal(subpath.isSoulseekFailure(new Error('soulseek.search timed out')), false);
});
