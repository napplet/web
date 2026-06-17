import { describe, it, expect, beforeAll } from 'vitest';
import type { NappletGlobal, ShellEnvironment } from '@napplet/core';

// Importing the shim runs its install side effects: it posts shell.ready and
// installs the central `message` listener that drives the NAP-SHELL handshake.
import '../src/index.js';

function napplet(): NappletGlobal {
  return (window as Window & { napplet: NappletGlobal }).napplet;
}

/** Deliver a shell.init as if posted by the parent runtime. */
function deliverShellInit(payload: Record<string, unknown>): void {
  const event = new MessageEvent('message', { data: payload });
  // handleEnvelopeMessage gates on event.source === window.parent.
  Object.defineProperty(event, 'source', { value: window.parent, configurable: true });
  window.dispatchEvent(event);
}

describe('@napplet/shim — NAP-SHELL handshake', () => {
  it('installs window.napplet.shell with the full foundational surface', () => {
    const shell = napplet().shell;
    expect(typeof shell.supports).toBe('function');
    expect(typeof shell.ready).toBe('function');
    expect(typeof shell.onReady).toBe('function');
    expect(Array.isArray(shell.services)).toBe(true);
    expect(shell.class).toBeNull();
  });

  it('answers supports() false before shell.init and leaves ready() pending', async () => {
    const shell = napplet().shell;
    expect(shell.supports('relay')).toBe(false);
    expect(shell.supports('relay', 'NAP-2')).toBe(false);
    expect(shell.services).toEqual([]);

    let resolved = false;
    void shell.ready().then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);
  });

  it('caches shell.init and answers supports()/services/class/ready/onReady from cache', async () => {
    const shell = napplet().shell;

    let onReadyEnv: ShellEnvironment | undefined;
    let onReadyCalls = 0;
    shell.onReady((env) => {
      onReadyCalls += 1;
      onReadyEnv = env;
    });

    const readyPromise = shell.ready();

    deliverShellInit({
      type: 'shell.init',
      capabilities: { domains: ['relay'], protocols: { relay: ['NAP-2'] } },
      services: ['signer'],
      class: 1,
    });

    const env = await readyPromise;
    expect(env.capabilities.domains).toEqual(['relay']);

    expect(shell.supports('relay')).toBe(true);
    expect(shell.supports('relay', 'NAP-2')).toBe(true);
    expect(shell.supports('unknown')).toBe(false);
    expect(shell.supports('relay', 'NAP-99')).toBe(false);
    expect(shell.services).toEqual(['signer']);
    expect(shell.class).toBe(1);

    // onReady fired exactly once with the env.
    expect(onReadyCalls).toBe(1);
    expect(onReadyEnv?.services).toEqual(['signer']);

    // ready() after delivery resolves immediately with the same env.
    await expect(shell.ready()).resolves.toBe(env);

    // onReady registered after delivery fires immediately.
    let lateFired = 0;
    shell.onReady(() => {
      lateFired += 1;
    });
    expect(lateFired).toBe(1);
  });

  it('is idempotent on a duplicate shell.init (first wins)', () => {
    const shell = napplet().shell;
    deliverShellInit({
      type: 'shell.init',
      capabilities: { domains: ['inc'], protocols: {} },
      services: ['other'],
      class: 9,
    });
    // The first init (relay, signer, class 1) still wins.
    expect(shell.supports('relay')).toBe(true);
    expect(shell.supports('inc')).toBe(false);
    expect(shell.services).toEqual(['signer']);
    expect(shell.class).toBe(1);
  });
});
