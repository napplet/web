import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as subpath from '@napplet/sdk/torrent';
import * as root from '@napplet/sdk';

const methods = ['capabilities', 'pickFiles', 'add', 'status', 'jobs', 'files', 'selectFiles', 'pause', 'resume', 'remove',
  'metadata', 'read', 'exportMetainfo', 'saveFile', 'openFile', 'cancel', 'update', 'onState', 'onProgress', 'onError'];

test('root, subpath, aliases and helpers delegate every operation to the current runtime', () => {
  const previous = globalThis.window;
  try {
    assert.equal(root.torrent, subpath.torrent);
    assert.equal(root.TORRENT_DOMAIN, 'torrent');
    for (const method of methods) {
      const args = method === 'capabilities' ? [] : ['selectFiles', 'remove', 'saveFile', 'openFile'].includes(method)
        ? [{ marker: method }, { options: true }] : [{ marker: method }];
      const result = { marker: method };
      const runtime = { [method](...received) { assert.deepEqual(received, args); return result; } };
      globalThis.window = { napplet: { torrent: runtime } };
      const helper = `torrent${method[0].toUpperCase()}${method.slice(1)}`;
      assert.equal(root.torrent[method](...args), result);
      assert.equal(subpath[method](...args), result);
      assert.equal(root[helper](...args), result);
      assert.equal(subpath[helper](...args), result);
      globalThis.window.napplet = {};
      assert.throws(() => subpath.torrent[method](...args), /torrent.*unavailable/);
    }
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});

const retired = ['fromEvent', 'toMagnet', 'search', 'publish', 'comment'];
test('torrent exports contain transfer operations only', () => {
  for (const method of retired) {
    const helper = `torrent${method[0].toUpperCase()}${method.slice(1)}`;
    assert.equal(method in root.torrent, false);
    assert.equal(method in subpath, false);
    assert.equal(helper in root, false);
    assert.equal(helper in subpath, false);
  }
});

test('SDK preserves runtime request IDs on cancellable promises', async () => {
  const previous = globalThis.window;
  try {
    for (const method of ['read', 'exportMetainfo', 'saveFile']) {
      const pending = Object.assign(Promise.resolve({ ok: false, error: 'cancelled' }), { requestId: 'pending-id' });
      const runtime = { [method]: () => pending, cancel: (requestId) => {
        assert.equal(requestId, pending.requestId);
        return Promise.resolve({ ok: true, cancelled: true });
      } };
      globalThis.window = { napplet: { torrent: runtime } };
      const result = root.torrent[method]('job', 0);
      assert.equal(result, pending);
      assert.equal(result.requestId, 'pending-id');
      assert.deepEqual(await root.torrent.cancel(result.requestId), { ok: true, cancelled: true });
    }
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});
