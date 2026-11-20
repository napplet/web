import type { NappletGlobal } from '@napplet/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type PreludeGlobal = { install(options: { domains: string[] }): NappletGlobal };
const host = globalThis as typeof globalThis & { NappletShimPrelude?: PreludeGlobal; napplet?: NappletGlobal };

beforeEach(() => {
  vi.resetModules();
  delete host.napplet;
  Reflect.deleteProperty(globalThis, 'NappletShimPrelude');
});

// NIP-5D §Security: runtime injection MUST be limited to the `window.napplet` namespace.
describe('@napplet/shim/prelude.global entry', () => {
  it('removes the activation global on install so napplet code cannot widen its domains', async () => {
    await import('./prelude-global.js');
    const prelude = host.NappletShimPrelude;
    expect(prelude?.install).toEqual(expect.any(Function));

    const installed = prelude!.install({ domains: ['identity'] });

    expect(host.napplet).toBe(installed);
    expect(Object.keys(installed)).toEqual(['identity']);
    expect('NappletShimPrelude' in globalThis).toBe(false);
  });

  it('removes the activation global even when install rejects its options', async () => {
    await import('./prelude-global.js');
    const prelude = host.NappletShimPrelude!;

    expect(() => prelude.install(undefined as never)).toThrow('explicit domains array');
    expect('NappletShimPrelude' in globalThis).toBe(false);
  });

  it('defines the activation global as non-enumerable and frozen', async () => {
    await import('./prelude-global.js');

    expect(Object.keys(globalThis)).not.toContain('NappletShimPrelude');
    expect(Object.isFrozen(host.NappletShimPrelude)).toBe(true);
  });
});
