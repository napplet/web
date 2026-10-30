import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import type { NappletGlobal } from '@napplet/core';
import { runtimePrelude } from './boot.js';
import { createReferenceShell } from '../shell/reference-shell.js';

const source = readFileSync(new URL('../../../shim/dist/prelude.global.js', import.meta.url), 'utf8');

function fixture(domains: string[], preludeSource?: string) {
  const listeners = new Map<string, Set<(event: unknown) => void>>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const shell = createReferenceShell();
  const deliver = (data: unknown, sender: unknown = parent) => {
    for (const listener of listeners.get('message') ?? []) listener({ data, source: sender });
  };
  const parent = {
    postMessage(message: { type: string }) {
      if (message.type.startsWith('__nappletConformance.')) return;
      for (const response of shell.handle(message)) queueMicrotask(() => deliver(response));
    },
  };
  const target = {
    parent,
    crypto: globalThis.crypto,
    addEventListener(type: string, handler: (event: unknown) => void) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(handler);
    },
    removeEventListener(type: string, handler: (event: unknown) => void) {
      listeners.get(type)?.delete(handler);
    },
  };
  const schedule = (callback: () => void, ms: number) => {
    const timer = setTimeout(callback, ms);
    timers.add(timer);
    return timer;
  };
  // The isolated realm executes the actual maintained IIFE as a classic script.
  // It does not substitute domain methods or evaluate an app-owned shim.
  const script = runtimePrelude(domains, preludeSource);
  runInNewContext(script, { window: target, crypto: globalThis.crypto, console, Blob, URL, TextDecoder, TextEncoder, queueMicrotask, setTimeout: schedule, clearTimeout });
  return {
    napplet: (target as typeof target & { napplet: NappletGlobal }).napplet,
    shell,
    deliver,
    close() { for (const timer of timers) clearTimeout(timer); },
  };
}

describe('reference runtime bindings', () => {
  it('installs callable maintained INC, INTENT and THEME bindings', () => {
    const host = fixture(['inc', 'intent', 'theme'], source);
    try {
      expect(typeof host.napplet.inc?.on).toBe('function');
      expect(typeof host.napplet.intent?.onDelivery).toBe('function');
      expect(typeof host.napplet.theme?.onChanged).toBe('function');
    } finally { host.close(); }
  });

  it('round-trips subscriptions and theme requests through the real reference shell', async () => {
    const host = fixture(['inc', 'theme'], source);
    try {
      const subscription = host.napplet.inc!.on('conformance:binding', () => {});
      const theme = await host.napplet.theme!.get();
      expect(theme.colors).toBeDefined();
      subscription.close();
      const types = host.shell.records.map(record => (record.envelope as { type: string }).type);
      expect(types).toContain('inc.subscribe');
      expect(types).toContain('inc.unsubscribe');
      expect(types).toContain('theme.get');
      expect(host.shell.records.every(record => record.verdict.ok)).toBe(true);
    } finally { host.close(); }
  });

  it('round-trips mesh through the built IIFE and offline reference shell', async () => {
    const host = fixture(['mesh'], source);
    try {
      expect(Object.keys(host.napplet)).toEqual(['mesh']);
      const mesh = host.napplet.mesh!;
      await expect(mesh.info()).resolves.toEqual({ online: false, peers: 0, limits: { publishTtl: 0, subscribeTtl: 0 } });
      const hash = 'a'.repeat(64);
      await expect(mesh.blobs([hash])).resolves.toEqual({ peers: 0, blobs: { [hash]: 0 } });
      await expect(mesh.publish({ kind: 20666, content: 'ding' }, { ttl: 2 })).resolves.toEqual({ ok: false, error: 'reference shell has no mesh signer or event store' });
      const deliveries: unknown[] = [];
      const sub = mesh.subscribe({ kinds: [9] }, { ttl: 10 });
      sub.on('eose', (ttl) => deliveries.push(ttl));
      sub.on('closed', (reason) => deliveries.push(reason));
      await Promise.resolve();
      expect(deliveries).toEqual([0, 'reference shell complete']);
      expect(host.shell.records.every(record => record.verdict.ok)).toBe(true);
      sub.close();
    } finally { host.close(); }
  });

  it('does not advertise unavailable domains in the fallback runtime', () => {
    const host = fixture(['inc', 'intent', 'theme', 'resource', 'mesh']);
    try {
      expect(host.napplet.mesh).toBeUndefined();
      expect(host.napplet.inc).toBeUndefined();
      expect(host.napplet.intent).toBeUndefined();
      expect(host.napplet.theme).toBeUndefined();
      expect(typeof host.napplet.resource?.bytes).toBe('function');
    } finally { host.close(); }
  });
});
