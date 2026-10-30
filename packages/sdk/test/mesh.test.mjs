import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mesh, info, publish, subscribe, blobs } from '@napplet/sdk/mesh';
import { mesh as rootMesh, MESH_DOMAIN, meshInfo, meshPublish, meshSubscribe, meshBlobs } from '@napplet/sdk';

test('root and mesh subpath use the current injected domain without granting it', async () => {
  const previous = globalThis.window;
  const calls = [];
  const status = { online: false, peers: 0, limits: { publishTtl: 3, subscribeTtl: 2 } };
  const published = { ok: false, error: 'not granted' };
  const subscription = { on() {}, close() {} };
  const counts = { peers: 0, blobs: { ['a'.repeat(64)]: 0 } };
  const template = { kind: 20666, content: 'ding', tags: [['t', 'doorbell']] };
  const filters = { kinds: [9], '#h': ['kitchen'] };
  const options = { ttl: 0 };
  const hashes = ['a'.repeat(64)];
  try {
    globalThis.window = { napplet: {} };
    assert.equal(rootMesh, mesh);
    assert.equal(MESH_DOMAIN, 'mesh');
    assert.throws(() => info(), /mesh/);
    assert.deepEqual(Object.keys(globalThis.window.napplet), []);
    globalThis.window.napplet.mesh = {
      info: () => status,
      publish: (...args) => { calls.push(args); return published; },
      subscribe: (...args) => { calls.push(args); return subscription; },
      blobs: (...args) => { calls.push(args); return counts; },
    };
    for (const call of [info, mesh.info, meshInfo]) assert.deepEqual(await call(), status);
    for (const call of [publish, mesh.publish, meshPublish]) assert.deepEqual(await call(template, options), published);
    for (const call of [subscribe, mesh.subscribe, meshSubscribe]) assert.equal(call(filters, options), subscription);
    for (const call of [blobs, mesh.blobs, meshBlobs]) assert.deepEqual(await call(hashes), counts);
    assert.deepEqual(calls, [...Array(3).fill([template, options]), ...Array(3).fill([filters, options]), ...Array(3).fill([hashes])]);
    delete globalThis.window.napplet.mesh;
    assert.throws(() => mesh.subscribe(filters), /mesh/);
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});
