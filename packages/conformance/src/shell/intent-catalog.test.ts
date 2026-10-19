import { describe, expect, it } from 'vitest';
import { catalogAvailability, type CatalogManifest } from './intent-catalog.js';

const publisher = 'a'.repeat(64);
const manifest: CatalogManifest = { kind: 35129, pubkey: publisher, id: '1'.repeat(64), tags: [
  ['i', 'napplet:feed/edit', 'filters', 'relays'], ['z', 'feed'], ['i', 'napplet:profile/open', 'pubkey'],
  ['d', 'Viewer'], ['i', 'napplet:feed/open'], ['i', 'napplet:feed/open'],
] };

describe('reference manifest catalog', () => {
  it('joins z/i by role independently of tag order and preserves parameter order', () => {
    const availability = catalogAvailability([manifest], 'feed');
    expect(availability.available).toBe(true);
    expect(availability.candidates[0]).toMatchObject({ id: `named:${publisher}:Viewer`, actions: ['edit', 'open'], conventions: ['napplet:feed/edit', 'napplet:feed/open'], contracts: [
      { convention: 'napplet:feed/edit', params: ['filters', 'relays'] }, { convention: 'napplet:feed/open', params: [] }, { convention: 'napplet:feed/open', params: [] },
    ] });
    expect(catalogAvailability([manifest], 'profile').available).toBe(false);
  });

  it('ignores unusable and legacy advertisements without invalidating a manifest', () => {
    const tags = [['z', 'feed'], ['archetype', 'feed', 'napplet:feed/open'], ['i', 'napplet:feed/open?x=1'], ['i', 'napplet:feed/open#hint'], ['i', 'napplet:profile/open']];
    expect(catalogAvailability([{ ...manifest, tags }], 'feed').candidates).toEqual([]);
  });

  it('distinguishes publishers, kinds, snapshots and preserves named/root update identity', () => {
    const variants: CatalogManifest[] = [manifest, { ...manifest, pubkey: 'b'.repeat(64) }, { ...manifest, kind: 15129 }, { ...manifest, kind: 5129 }, { ...manifest, kind: 5129, id: '2'.repeat(64) }];
    const ids = catalogAvailability(variants, 'feed').candidates.map((item) => item.id);
    expect(new Set(ids).size).toBe(5);
    for (const kind of [15129, 35129] as const) {
      const first = catalogAvailability([{ ...manifest, kind }], 'feed').candidates[0].id;
      const updated = catalogAvailability([{ ...manifest, kind, id: '3'.repeat(64) }], 'feed').candidates[0].id;
      expect(updated).toBe(first);
    }
  });
});
