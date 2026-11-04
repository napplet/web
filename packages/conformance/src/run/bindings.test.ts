import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import type { NappletGlobal } from '@napplet/core';
import { runtimePrelude } from './boot.js';
import { createReferenceShell } from '../shell/reference-shell.js';
import { bindNappletPort } from '../shell/port-binding.js';

const source = readFileSync(new URL('../../../shim/dist/prelude.global.js', import.meta.url), 'utf8');

// A MessageChannel for the isolated realm: napplet -> shell is synchronous (as the shell handler was before),
// shell -> napplet is a microtask, like browser port delivery.
class Port {
  other: Port | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  constructor(private readonly async: boolean) {}
  postMessage(data: unknown) {
    const send = () => this.other?.onmessage?.({ data: structuredClone(data) });
    if (this.async) queueMicrotask(send);
    else send();
  }
  addEventListener() {}
  start() {}
  close() { this.onmessage = null; }
}
class Channel {
  port1 = new Port(false);
  port2 = new Port(true);
  constructor() { this.port1.other = this.port2; this.port2.other = this.port1; }
}

function fixture(domains: string[], preludeSource: string) {
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const shell = createReferenceShell();
  let hostListener: ((event: MessageEvent) => void) | undefined;
  const hellos: unknown[] = [];
  const target: Record<string, unknown> = {
    crypto: globalThis.crypto,
    addEventListener() {},
    removeEventListener() {},
  };
  target.parent = {
    postMessage(message: { type: string }, _origin: string, transfer: unknown[] = []) {
      if (message.type.startsWith('__nappletConformance.')) return;
      if (message.type === 'napplet.hello') hellos.push(message);
      hostListener?.({ source: target, data: message, ports: transfer } as unknown as MessageEvent);
    },
  };
  // The reference shell side is the real NIP-5D binding used by the browser harness.
  const binding = bindNappletPort({
    host: {
      addEventListener: (_type, listener) => { hostListener = listener; },
      removeEventListener: () => { hostListener = undefined; },
    },
    source: target,
    onMessage: (envelope) => shell.handle(envelope),
  });
  const schedule = (callback: () => void, ms: number) => {
    const timer = setTimeout(callback, ms);
    timers.add(timer);
    return timer;
  };
  // The isolated realm executes the actual maintained IIFE as a classic script.
  // It does not substitute domain methods or evaluate an app-owned shim.
  const script = runtimePrelude(domains, preludeSource);
  runInNewContext(script, { window: target, crypto: globalThis.crypto, console, Blob, URL, TextDecoder, TextEncoder, MessageChannel: Channel, structuredClone, queueMicrotask, setTimeout: schedule, clearTimeout });
  return {
    napplet: (target as typeof target & { napplet: NappletGlobal }).napplet,
    shell,
    binding,
    hellos,
    close() { for (const timer of timers) clearTimeout(timer); binding.detach(); },
  };
}

describe('reference runtime bindings', () => {
  it('installs callable maintained INC, INTENT and THEME bindings', () => {
    const host = fixture(['inc', 'intent', 'theme'], source);
    try {
      expect(typeof host.napplet.inc?.on).toBe('function');
      expect(typeof host.napplet.intent?.onDelivery).toBe('function');
      expect(typeof host.napplet.theme?.onChanged).toBe('function');
      // NIP-5D Transport: exactly one napplet.hello carrying one port, bound before any napplet script.
      expect(host.hellos).toHaveLength(1);
      expect(host.binding.bound).toBe(true);
      expect(host.binding.violations).toEqual([]);
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

  it('installs only the domains in the explicit allowlist', () => {
    const host = fixture(['resource'], source);
    try {
      expect(host.napplet.inc).toBeUndefined();
      expect(host.napplet.intent).toBeUndefined();
      expect(host.napplet.theme).toBeUndefined();
      expect(host.napplet.gamepad).toBeUndefined();
      expect(host.napplet.llm).toBeUndefined();
      expect(typeof host.napplet.resource?.bytes).toBe('function');
    } finally { host.close(); }
  });

  it('subscribes GAMEPAD on first use and applies the reference shell state', async () => {
    const host = fixture(['gamepad'], source);
    try {
      const api = host.napplet.gamepad!;
      expect(host.shell.records).toEqual([]);
      const states: unknown[] = [];
      const subscription = api.onChange((state) => states.push(state));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(host.shell.records.map(record => (record.envelope as { type: string }).type)).toEqual(['gamepad.subscribe']);
      expect(host.shell.records.every(record => record.verdict.ok)).toBe(true);
      expect(states).toEqual([{ available: false, reason: 'unavailable', focused: false, pads: [] }]);
      expect(api.available).toBe(false);
      subscription.close();
    } finally { host.close(); }
  });

  it('round-trips LLM selection and generation through the reference shell', async () => {
    const host = fixture(['llm'], source);
    try {
      const api = host.napplet.llm!;
      const model = await api.select({ json: true });
      expect(model.model).toBe('reference-model');
      const deltas: string[] = [];
      const generation = await api.generate(
        { handle: model.handle, messages: [{ role: 'user', content: [{ type: 'text', text: 'Say hello.' }] }] },
        { onDelta: (delta) => deltas.push(delta.event) },
      );
      expect(generation).toMatchObject({ content: [{ type: 'text', text: 'Echo: Say hello.' }], finish: 'stop' });
      expect(deltas).toEqual(['start', 'delta', 'end']);
      const types = host.shell.records.map(record => (record.envelope as { type: string }).type);
      expect(types).toEqual(['llm.select', 'llm.generate']);
      expect(host.shell.records.every(record => record.verdict.ok)).toBe(true);
    } finally { host.close(); }
  });
});
