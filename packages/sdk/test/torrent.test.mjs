import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as subpath from '@napplet/sdk/torrent';
import * as root from '@napplet/sdk';

const methods = ['capabilities', 'fromEvent', 'toMagnet', 'search', 'publish', 'comment', 'pickFiles',
  'add', 'status', 'jobs', 'files', 'selectFiles', 'pause', 'resume', 'remove', 'onState', 'onProgress', 'onError'];

test('root, subpath, aliases and helpers delegate every operation to the current runtime', () => {
  const previous = globalThis.window;
  try {
    assert.equal(root.torrent, subpath.torrent);
    assert.equal(root.TORRENT_DOMAIN, 'torrent');
    for (const method of methods) {
      const args = method === 'capabilities' ? [] : ['selectFiles', 'remove'].includes(method)
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
