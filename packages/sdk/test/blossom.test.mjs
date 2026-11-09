import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as subpath from '@napplet/sdk/blossom';
import * as root from '@napplet/sdk';

const operations = ['check', 'get', 'checkUpload', 'upload', 'mirror', 'checkMedia', 'media', 'list', 'delete', 'servers', 'addServer', 'removeServer', 'reorderServers'];

test('built Blossom exports delegate every operation to the current injected domain', () => {
  assert.equal(root.BLOSSOM_DOMAIN, 'blossom');
  assert.equal(root.blossom, subpath.blossom);
  const previous = globalThis.window;
  try {
    for (const name of operations) {
      const marker = {};
      const arg = name === 'upload' ? { server: 'https://cdn.example.com', data: new Blob(['exact bytes']) } : {};
      const calls = [];
      globalThis.window = { napplet: { blossom: { [name]: (...args) => { calls.push(args); return marker; } } } };
      const prefixed = `blossom${name[0].toUpperCase()}${name.slice(1)}`;
      for (const fn of [root.blossom[name], root[prefixed], subpath[name]]) {
        assert.equal(typeof fn, 'function', name);
        assert.equal(fn(arg), marker);
      }
      assert.deepEqual(calls, name === 'servers' ? [[], [], []] : [[arg], [arg], [arg]]);
      globalThis.window.napplet = {};
      assert.throws(() => root.blossom[name](arg), /blossom/);
    }
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});

test('built Blossom URI helpers run locally without an injected domain', () => {
  const previous = globalThis.window;
  const uri = `blossom:${'b'.repeat(64)}.pdf?sz=184292`;
  try {
    for (const global of [undefined, { napplet: {} }]) {
      if (global === undefined) delete globalThis.window;
      else globalThis.window = global;
      for (const [parse, format] of [[root.blossom.parseUri, root.blossom.formatUri], [root.blossomParseUri, root.blossomFormatUri], [subpath.parseUri, subpath.formatUri]]) {
        assert.equal(format(parse(uri)), uri);
      }
    }
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});
