import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let posted: Record<string, unknown>[];
let cleanup: (() => void) | undefined;
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  posted = [];
  let id = 0;
  vi.stubGlobal('crypto', { randomUUID: () => `mesh-${++id}` });
  vi.stubGlobal('window', { parent: { postMessage: (message: Record<string, unknown>) => posted.push(message) } });
});
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function binding() {
  const mesh = await import('./shim.js');
  cleanup = mesh.installMeshShim();
  return mesh;
}
const infoResult = { online: false, peers: 0, limits: { publishTtl: 3, subscribeTtl: 2 } };
const event = { id: 'a'.repeat(64), pubkey: 'b'.repeat(64), kind: 20666, content: 'ding', tags: [['t', 'doorbell']], created_at: 1234567890, sig: 'c'.repeat(128) };

describe('NAP-MESH binding', () => {
  it('correlates info independently from blobs and rejects unavailable queries', async () => {
    const mesh = await binding();
    const info = mesh.info();
    const hashes = ['a'.repeat(64), '0'.repeat(63) + '1'];
    const blobs = mesh.blobs(hashes);
    expect(posted).toEqual([{ type: 'mesh.info', id: 'mesh-1' }, { type: 'mesh.blobs', id: 'mesh-2', hashes }]);
    mesh.handleMeshMessage({ type: 'mesh.blobs.result', id: 'mesh-1', peers: 0, blobs: {} });
    mesh.handleMeshMessage({ type: 'mesh.info.result', id: 'unknown', ...infoResult });
    mesh.handleMeshMessage({ type: 'mesh.blobs.result', id: 'mesh-2', peers: 0, blobs: Object.fromEntries(hashes.map(hash => [hash, 0])) });
    mesh.handleMeshMessage({ type: 'mesh.info.result', id: 'mesh-1', ...infoResult });
    await expect(info).resolves.toEqual(infoResult);
    await expect(blobs).resolves.toEqual({ peers: 0, blobs: Object.fromEntries(hashes.map(hash => [hash, 0])) });
    const failed = mesh.info();
    mesh.handleMeshMessage({ type: 'mesh.info.result', id: 'mesh-3', error: 'circle unavailable' });
    await expect(failed).rejects.toThrow('circle unavailable');
    const failedBlobs = mesh.blobs(hashes);
    mesh.handleMeshMessage({ type: 'mesh.blobs.result', id: 'mesh-4', error: 'cannot ask members' });
    await expect(failedBlobs).rejects.toThrow('cannot ask members');
  });

  it('rejects malformed results instead of fabricating offline status or zero counts', async () => {
    const mesh = await binding();
    const info = mesh.info();
    mesh.handleMeshMessage({ type: 'mesh.info.result', id: posted.at(-1)!.id });
    await expect(info).rejects.toThrow('missing circle information');
    const blobs = mesh.blobs([]);
    mesh.handleMeshMessage({ type: 'mesh.blobs.result', id: posted.at(-1)!.id, peers: 0 });
    await expect(blobs).rejects.toThrow('missing blob counts');
    const publish = mesh.publish({ kind: 1, content: 'hello' });
    mesh.handleMeshMessage({ type: 'mesh.publish.result', id: posted.at(-1)!.id });
    await expect(publish).rejects.toThrow('missing ok');
  });

  it('keeps TTL outside signed content and preserves omission, zero, and shell clamp', async () => {
    const mesh = await binding();
    const template = { kind: 20666, content: 'ding', tags: [['t', 'doorbell']] };
    for (const ttl of [undefined, 0, 10]) {
      const promise = mesh.publish(template, ttl === undefined ? undefined : { ttl });
      const sent = posted.at(-1)!;
      expect(sent).toEqual({ type: 'mesh.publish', id: sent.id, event: template, ...(ttl === undefined ? {} : { ttl }) });
      mesh.handleMeshMessage({ type: 'mesh.publish.result', id: sent.id, ok: true, event, eventId: event.id, ttl: ttl === 0 ? 0 : 3 });
      await expect(promise).resolves.toEqual({ ok: true, event, eventId: event.id, ttl: ttl === 0 ? 0 : 3 });
    }
    const refused = mesh.publish(template, { ttl: -1 });
    mesh.handleMeshMessage({ type: 'mesh.publish.result', id: posted.at(-1)!.id, ok: false, error: 'malformed ttl' });
    await expect(refused).resolves.toEqual({ ok: false, error: 'malformed ttl' });
  });

  it('keeps subscriptions live after eose and isolates their deliveries', async () => {
    const mesh = await binding();
    const sub = mesh.subscribe({ kinds: [9], '#h': ['kitchen'] }, { ttl: 0 });
    const sent = posted.at(-1)!;
    expect(sent).toEqual({ type: 'mesh.subscribe', id: sent.id, subId: sent.subId, filters: [{ kinds: [9], '#h': ['kitchen'] }], ttl: 0 });
    expect(sent.id).not.toBe(sent.subId);
    const other = mesh.subscribe([{ kinds: [20666] }]);
    expect(posted.at(-1)).not.toHaveProperty('ttl');
    const events = vi.fn();
    const eose = vi.fn();
    const closed = vi.fn();
    sub.on('event', events);
    sub.on('eose', eose);
    sub.on('closed', closed);
    mesh.handleMeshMessage({ type: 'relay.event', subId: sent.subId, result: { event } });
    mesh.handleMeshMessage({ type: 'mesh.event', subId: posted.at(-1)!.subId, result: { event } });
    expect(events).not.toHaveBeenCalled();
    mesh.handleMeshMessage({ type: 'mesh.event', subId: sent.subId, result: { event } });
    mesh.handleMeshMessage({ type: 'mesh.eose', subId: sent.subId, ttl: 0 });
    mesh.handleMeshMessage({ type: 'mesh.event', subId: sent.subId, result: { event } });
    expect(events).toHaveBeenCalledTimes(2);
    expect(eose).toHaveBeenCalledExactlyOnceWith(0);
    mesh.handleMeshMessage({ type: 'mesh.closed', subId: sent.subId, reason: 'revoked' });
    mesh.handleMeshMessage({ type: 'mesh.event', subId: sent.subId, result: { event } });
    expect(events).toHaveBeenCalledTimes(2);
    expect(closed).toHaveBeenCalledExactlyOnceWith('revoked');
    const count = posted.length;
    sub.close();
    expect(posted).toHaveLength(count);
    other.close();
  });

  it('surfaces refusal by request id and closes idempotently with no id', async () => {
    const mesh = await binding();
    const sub = mesh.subscribe({ kinds: [20666] });
    const sent = posted.at(-1)!;
    const closed = vi.fn();
    sub.on('closed', closed);
    mesh.handleMeshMessage({ type: 'mesh.subscribe.result', id: sent.id, error: 'mesh not granted' });
    expect(closed).toHaveBeenCalledExactlyOnceWith('mesh not granted');
    sub.close();
    expect(posted).toHaveLength(1);
    const live = mesh.subscribe({ kinds: [9] });
    const liveSent = posted.at(-1)!;
    live.close();
    live.close();
    expect(posted.at(-1)).toEqual({ type: 'mesh.close', subId: liveSent.subId });
    expect(posted).toHaveLength(3);
  });

  it('settles pending calls on cleanup and releases active subscriptions', async () => {
    const mesh = await binding();
    const pending = mesh.info();
    const rejection = expect(pending).rejects.toThrow('mesh shim disposed');
    const sub = mesh.subscribe({ kinds: [9] });
    const sent = posted.at(-1)!;
    cleanup!();
    cleanup!();
    await rejection;
    expect(posted.at(-1)).toEqual({ type: 'mesh.close', subId: sent.subId });
    sub.close();
    expect(posted).toHaveLength(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('bounds requests and removes failed posts from pending state', async () => {
    const mesh = await binding();
    const pending = mesh.info();
    const timedOut = expect(pending).rejects.toThrow('mesh.info timed out');
    await vi.advanceTimersByTimeAsync(30_000);
    await timedOut;
    window.parent.postMessage = () => { throw new Error('post failed'); };
    await expect(mesh.blobs([])).rejects.toThrow('post failed');
    expect(() => mesh.subscribe({ kinds: [1] })).toThrow('post failed');
    expect(vi.getTimerCount()).toBe(0);
  });
});
