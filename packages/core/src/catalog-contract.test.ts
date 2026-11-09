import { describe, expect, expectTypeOf, it } from 'vitest';
import { NAP_DOMAINS } from './index.js';
import type { CatalogApi, CatalogSnapshot, NappletGlobal, NappletIdentity } from './index.js';

describe('catalog public type contract', () => {
  it('supports named, root and snapshot identities without inventing d tags', () => {
    const version = { pubkey: 'a'.repeat(64), eventId: 'b'.repeat(64), artifactHash: 'c'.repeat(64) };
    const named: NappletIdentity = { ...version, kind: 35129, dTag: 'note' };
    const root: NappletIdentity = { ...version, kind: 15129 };
    const snapshot: NappletIdentity = { ...version, kind: 5129 };
    expect(named.dTag).toBe('note');
    expect(root).not.toHaveProperty('dTag');
    expect(snapshot).not.toHaveProperty('dTag');
    expectTypeOf<Extract<NappletIdentity, { kind: 35129 }>['dTag']>().toEqualTypeOf<string>();
    expectTypeOf<Exclude<NappletIdentity, { kind: 35129 }>['dTag']>().toEqualTypeOf<undefined>();
  });

  it('exposes catalog independently of intent or shell', async () => {
    const snapshot: CatalogSnapshot = { napplets: [], handlers: [] };
    const api: CatalogApi = { get: async () => snapshot };
    const injected: NappletGlobal = { catalog: api };
    expect(NAP_DOMAINS).toContain('catalog');
    expect(injected.intent).toBeUndefined();
    expect(injected.shell).toBeUndefined();
    await expect(injected.catalog!.get()).resolves.toEqual(snapshot);
  });
});
