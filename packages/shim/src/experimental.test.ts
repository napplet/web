import type { NappletGlobal } from '@napplet/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Posted = { type: string; [key: string]: unknown };
type Host = typeof globalThis & { napplet?: NappletGlobal & Record<string, unknown> };

let posted: Posted[];
let shellPort: MessagePort | null;

beforeEach(() => {
  vi.resetModules();
  posted = [];
  shellPort = null;
  delete (globalThis as Host).napplet;
  // Capture the napplet.hello port so the test can play the shell.
  vi.spyOn(window.parent, 'postMessage').mockImplementation(((_msg: unknown, _origin: string, transfer?: Transferable[]) => {
    shellPort = (transfer?.[0] as MessagePort) ?? null;
    if (shellPort) shellPort.onmessage = (event: MessageEvent) => posted.push(event.data as Posted);
  }) as typeof window.parent.postMessage);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('experimental domain extensions', () => {
  it('mounts a registered domain only when the runtime exposes it', async () => {
    const { installNappletGlobal } = await import('./runtime.js');
    const extension = { domain: 'mesh', create: vi.fn(() => ({ ping: () => 'pong' })) };

    const hidden = installNappletGlobal({ domains: ['storage'], extensions: [extension] }) as Host['napplet'];
    expect(hidden?.mesh).toBeUndefined();

    const shown = installNappletGlobal({ domains: ['storage', 'mesh'] }) as Host['napplet'];
    expect((shown?.mesh as { ping(): string }).ping()).toBe('pong');
    expect(shown?.relay).toBeUndefined();

    installNappletGlobal({ domains: ['mesh'] });
    expect(extension.create).toHaveBeenCalledTimes(1);
  });

  it('never mounts experimental domains from the install-all default', async () => {
    const { installNappletGlobal } = await import('./runtime.js');
    const installed = installNappletGlobal({ extensions: [{ domain: 'mesh', create: () => ({}) }] }) as Host['napplet'];
    expect(installed?.mesh).toBeUndefined();
    expect(installed?.relay).toBeDefined();
  });

  it('ignores an exposed experimental name with no registered extension', async () => {
    const { installNappletGlobal } = await import('./runtime.js');
    const installed = installNappletGlobal({ domains: ['unregistered'] }) as Host['napplet'];
    expect(installed?.unregistered).toBeUndefined();
  });

  it('sends only its own domain over the port and receives its own envelopes', async () => {
    const { installNappletGlobal } = await import('./runtime.js');
    let channel!: import('./experimental.js').ExperimentalDomainChannel;
    const received: Posted[] = [];
    installNappletGlobal({
      domains: ['mesh'],
      extensions: [{ domain: 'mesh', create: (c) => { channel = c; c.onMessage((m) => received.push(m)); return {}; } }],
    });

    channel.send({ type: 'mesh.publish', topic: 't' });
    expect(() => channel.send({ type: 'relay.publish' })).toThrow('can only send mesh.<action>');
    expect(() => channel.send({ type: 'mesh.' })).toThrow();
    await flush();
    expect(posted.filter((m) => m.type.startsWith('mesh.') || m.type.startsWith('relay.'))).toEqual([{ type: 'mesh.publish', topic: 't' }]);

    shellPort!.postMessage({ type: 'mesh.event', topic: 't' });
    shellPort!.postMessage({ type: 'relay.event', subId: 's' });
    await flush();
    expect(received).toEqual([{ type: 'mesh.event', topic: 't' }]);
  });

  it.each([
    ['a bundled NAP domain', 'relay', 'is a NAP domain'],
    ['a non-bare name', 'mesh.v2', 'not a bare domain'],
    ['a prototype member', '__proto__', 'cannot be used'],
  ])('refuses to register %s', async (_label, domain, message) => {
    const { registerNappletDomainExtension } = await import('./experimental.js');
    expect(() => registerNappletDomainExtension({ domain, create: () => ({}) })).toThrow(message);
  });

  it('refuses a second, different extension for the same domain', async () => {
    const { registerNappletDomainExtension } = await import('./experimental.js');
    const first = { domain: 'mesh', create: () => ({}) };
    registerNappletDomainExtension(first);
    registerNappletDomainExtension(first);
    expect(() => registerNappletDomainExtension({ domain: 'mesh', create: () => ({}) })).toThrow('already registered');
  });
});

describe('@napplet/shim/prelude.global registerExtension', () => {
  it('registers before install and disappears with the global', async () => {
    Reflect.deleteProperty(globalThis, 'NappletShimPrelude');
    await import('./prelude-global.js');
    const prelude = (globalThis as typeof globalThis & { NappletShimPrelude?: {
      registerExtension(extension: unknown): void;
      install(options: { domains: string[] }): NappletGlobal & Record<string, unknown>;
    } }).NappletShimPrelude!;

    prelude.registerExtension({ domain: 'mesh', create: () => ({ hello: true }) });
    const installed = prelude.install({ domains: ['mesh'] });

    expect(installed.mesh).toEqual({ hello: true });
    expect('NappletShimPrelude' in globalThis).toBe(false);
  });
});
