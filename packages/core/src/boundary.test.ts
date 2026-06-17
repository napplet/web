import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearCloneWarnings,
  getCloneMode,
  sendEnvelope,
  setCloneMode,
  toCloneableSnapshot,
  type PostMessageTarget,
} from './boundary.js';

// ── Test doubles ──────────────────────────────────────────────────────────
// Model the iframe boundary: a target whose postMessage throws a DataCloneError
// when the message (deeply) contains a registered "reactive proxy" or a
// function, mirroring real structured-clone behavior.

const PROXIES = new WeakSet<object>();

/** Wrap an object in a Proxy that fails structured clone (like Svelte $state). */
function reactive<T extends object>(obj: T): T {
  const p = new Proxy(obj, {});
  PROXIES.add(p);
  return p;
}

function throwDataClone(): never {
  const err = new Error('Failed to execute postMessage: value could not be cloned');
  err.name = 'DataCloneError';
  throw err;
}

function assertCloneable(value: unknown, seen = new WeakSet<object>()): void {
  if (value === null) return;
  const t = typeof value;
  if (t === 'function' || t === 'symbol') throwDataClone();
  if (t !== 'object') return;
  const obj = value as object;
  if (PROXIES.has(obj)) throwDataClone();
  if (seen.has(obj)) return;
  seen.add(obj);
  if (obj instanceof Date || obj instanceof RegExp || ArrayBuffer.isView(obj)) return;
  if (Array.isArray(obj)) {
    for (const v of obj) assertCloneable(v, seen);
    return;
  }
  if (obj instanceof Map) {
    for (const [k, v] of obj) { assertCloneable(k, seen); assertCloneable(v, seen); }
    return;
  }
  if (obj instanceof Set) {
    for (const v of obj) assertCloneable(v, seen);
    return;
  }
  for (const key of Object.keys(obj)) assertCloneable((obj as Record<string, unknown>)[key], seen);
}

function makeTarget(): PostMessageTarget & { sent: unknown[] } {
  const sent: unknown[] = [];
  return {
    sent,
    postMessage(message: unknown) {
      assertCloneable(message);
      sent.push(message);
    },
  };
}

beforeEach(() => {
  setCloneMode('auto');
  clearCloneWarnings();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('toCloneableSnapshot', () => {
  it('passes primitives through unchanged', () => {
    expect(toCloneableSnapshot(42)).toBe(42);
    expect(toCloneableSnapshot('hi')).toBe('hi');
    expect(toCloneableSnapshot(null)).toBe(null);
    expect(toCloneableSnapshot(undefined)).toBe(undefined);
    expect(toCloneableSnapshot(true)).toBe(true);
  });

  it('strips reactive proxies into plain, equal, cloneable values', () => {
    const proxy = reactive({ filters: [{ kinds: [1] }], relays: ['wss://a'] });
    const snap = toCloneableSnapshot(proxy);
    expect(snap).toEqual({ filters: [{ kinds: [1] }], relays: ['wss://a'] });
    expect(PROXIES.has(snap as object)).toBe(false);
    expect(() => assertCloneable(snap)).not.toThrow();
  });

  it('strips nested reactive proxies', () => {
    const proxy = reactive({ inner: reactive({ a: 1 }), list: [reactive({ b: 2 })] });
    const snap = toCloneableSnapshot(proxy) as { inner: object; list: object[] };
    expect(snap).toEqual({ inner: { a: 1 }, list: [{ b: 2 }] });
    expect(PROXIES.has(snap.inner)).toBe(false);
    expect(PROXIES.has(snap.list[0])).toBe(false);
  });

  it('preserves binary data (unlike a JSON round-trip)', () => {
    const bytes = new Uint8Array([1, 2, 3, 255]);
    const snap = toCloneableSnapshot({ blob: bytes }) as { blob: Uint8Array };
    expect(snap.blob).toBeInstanceOf(Uint8Array);
    expect(Array.from(snap.blob)).toEqual([1, 2, 3, 255]);
  });

  it('preserves Date, Map, and Set', () => {
    const date = new Date('2026-06-18T00:00:00Z');
    const map = new Map([['k', 1]]);
    const set = new Set([1, 2]);
    const snap = toCloneableSnapshot({ date, map, set }) as {
      date: Date; map: Map<string, number>; set: Set<number>;
    };
    expect(snap.date).toBe(date); // leaf passed through by reference
    expect(snap.map).toBeInstanceOf(Map);
    expect(snap.map.get('k')).toBe(1);
    expect(snap.set).toBeInstanceOf(Set);
    expect([...snap.set]).toEqual([1, 2]);
  });

  it('handles cyclic references', () => {
    const a: Record<string, unknown> = { name: 'a' };
    a.self = a;
    const snap = toCloneableSnapshot(a) as Record<string, unknown>;
    expect(snap.name).toBe('a');
    expect(snap.self).toBe(snap);
  });

  it('throws on functions', () => {
    expect(() => toCloneableSnapshot({ fn: () => 1 })).toThrow(TypeError);
  });
});

describe('sendEnvelope — auto mode (default)', () => {
  it('posts a cloneable envelope as-is', () => {
    const target = makeTarget();
    const msg = { type: 'outbox.query', id: '1', filters: [{ kinds: [1] }] };
    sendEnvelope(target, msg);
    expect(target.sent).toEqual([msg]);
    expect(target.sent[0]).toBe(msg); // no snapshot taken on the happy path
  });

  it('recovers a reactive-proxy envelope via snapshot and warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const target = makeTarget();
    const filters = reactive([{ kinds: [1] }]);
    const msg = { type: 'outbox.subscribe', id: '1', subId: 's', filters };

    expect(() => sendEnvelope(target, msg)).not.toThrow();
    expect(target.sent).toHaveLength(1);
    expect(target.sent[0]).toEqual({
      type: 'outbox.subscribe', id: '1', subId: 's', filters: [{ kinds: [1] }],
    });
    expect(warn).toHaveBeenCalledTimes(1);

    // Second send of the same type does not warn again.
    sendEnvelope(target, { type: 'outbox.subscribe', id: '2', subId: 's2', filters });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('throws a loud, actionable error for genuinely non-cloneable args', () => {
    const target = makeTarget();
    const msg = { type: 'relay.publish', id: '1', cb: () => undefined };
    expect(() => sendEnvelope(target, msg)).toThrow(/relay\.publish/);
    expect(() => sendEnvelope(target, msg)).toThrow(/NappletDataCloneError|not.*structured-cloneable/i);
    expect(target.sent).toHaveLength(0);
  });

  it('rethrows non-DataCloneError failures untouched', () => {
    const boom = new Error('network down');
    const target: PostMessageTarget = { postMessage() { throw boom; } };
    expect(() => sendEnvelope(target, { type: 'x.y' })).toThrow(boom);
  });
});

describe('sendEnvelope — strict mode', () => {
  beforeEach(() => setCloneMode('strict'));

  it('throws immediately on a reactive proxy without recovering', () => {
    const target = makeTarget();
    const msg = { type: 'outbox.subscribe', filters: reactive([{ kinds: [1] }]) };
    expect(() => sendEnvelope(target, msg)).toThrow(/outbox\.subscribe/);
    expect(target.sent).toHaveLength(0);
  });

  it('still posts cloneable envelopes', () => {
    const target = makeTarget();
    sendEnvelope(target, { type: 'inc.emit', topic: 't' });
    expect(target.sent).toHaveLength(1);
  });
});

describe('sendEnvelope — snapshot mode', () => {
  beforeEach(() => setCloneMode('snapshot'));

  it('eagerly snapshots every envelope', () => {
    const target = makeTarget();
    const filters = reactive([{ kinds: [1] }]);
    const msg = { type: 'outbox.subscribe', filters };
    sendEnvelope(target, msg);
    expect(target.sent[0]).not.toBe(msg);
    expect(target.sent[0]).toEqual({ type: 'outbox.subscribe', filters: [{ kinds: [1] }] });
  });

  it('throws a loud error when even a snapshot cannot be made cloneable', () => {
    const target = makeTarget();
    expect(() => sendEnvelope(target, { type: 'media.play', cb: () => 1 })).toThrow(/media\.play/);
    expect(target.sent).toHaveLength(0);
  });
});

describe('clone mode accessors', () => {
  it('round-trips the mode', () => {
    setCloneMode('strict');
    expect(getCloneMode()).toBe('strict');
    setCloneMode('snapshot');
    expect(getCloneMode()).toBe('snapshot');
    setCloneMode('auto');
    expect(getCloneMode()).toBe('auto');
  });
});
