import { describe, expect, it } from 'vitest';
import type { CatalogSnapshot } from '@napplet/core';
import type { CatalogManifest } from './intent-catalog.js';
import { createReferenceShell, type ReferenceShell } from './reference-shell.js';

const publisher = 'a'.repeat(64);
const named: CatalogManifest = {
  kind: 35129, pubkey: publisher, id: 'b'.repeat(64), content: 'Displays a Nostr note.',
  tags: [['d', 'noteview'], ['x', 'c'.repeat(64)], ['title', '<Note>'],
    ['i', 'napplet:note/open', 'id'], ['z', 'note'], ['z', 'note'], ['z', 'profile'],
    ['R', 'relay'], ['R', 'storage'], ['O', 'future-domain']],
};
const selector = `named:${publisher}:noteview`;

function snapshot(shell: ReferenceShell): CatalogSnapshot {
  const [response] = shell.handle({ type: 'catalog.get', id: 'c1' }) as Array<{ snapshot: CatalogSnapshot }>;
  return response.snapshot;
}

describe('reference NAP-CATALOG snapshots', () => {
  it('maps verified metadata and keeps display text, parameter names, and conventions separate', () => {
    const result = snapshot(createReferenceShell({ manifests: [named] }));
    expect(result).toEqual({
      napplets: [{ id: selector, identity: { kind: 35129, pubkey: publisher, eventId: named.id, dTag: 'noteview', artifactHash: 'c'.repeat(64) },
        title: '<Note>', description: named.content, requires: ['relay', 'storage'], optional: ['future-domain'],
        archetypes: [{ archetype: 'note', intents: [{ intent: 'open', convention: 'napplet:note/open', parameters: ['id'] }] }, { archetype: 'profile', intents: [] }],
      }],
      handlers: [{ archetype: 'note', currentHandler: selector }, { archetype: 'profile', currentHandler: null }],
    });
  });

  it('includes role-less root and snapshot entries without dTag and distinguishes publishers', () => {
    const root: CatalogManifest = { ...named, kind: 15129, tags: [['x', 'c'.repeat(64)]] };
    const pin: CatalogManifest = { ...root, kind: 5129 };
    const other = { ...named, pubkey: 'd'.repeat(64) };
    const result = snapshot(createReferenceShell({ manifests: [named, root, pin, other] }));
    expect(new Set(result.napplets.map(entry => entry.id)).size).toBe(4);
    for (const entry of result.napplets.slice(1, 3)) {
      expect(entry.identity).not.toHaveProperty('dTag');
      expect(entry.archetypes).toEqual([]);
      expect(entry.requires).toEqual([]);
      expect(entry.optional).toEqual([]);
    }
  });

  it('retains exact queryless advertisements and ignores unmatched, queried, fragmented and legacy intents', () => {
    const tags = [...named.tags, ['i', 'napplet:note/edit', 'filters', 'relays'], ['i', 'napplet:note/open?x=1'],
      ['i', 'napplet:note/open#fragment'], ['i', 'napplet:other/open'], ['i', 'napplet:note/open%ZZ'],
      ['i', 'napplet:note/open space'], ['i', 'napplet:note/%6Fpen'], ['archetype', 'legacy', 'napplet:legacy/open']];
    const result = snapshot(createReferenceShell({ manifests: [{ ...named, tags }] }));
    expect(result.napplets[0].archetypes[0].intents).toEqual([
      { intent: 'open', convention: 'napplet:note/open', parameters: ['id'] },
      { intent: 'edit', convention: 'napplet:note/edit', parameters: ['filters', 'relays'] },
      { intent: '%6Fpen', convention: 'napplet:note/%6Fpen', parameters: [] },
    ]);
    expect(result.handlers.map(handler => handler.archetype)).toEqual(['note', 'profile']);
  });

  it('omits incomplete or malformed identity and description records', () => {
    const invalid: CatalogManifest[] = [
      { ...named, content: undefined }, { ...named, content: '  ' }, { ...named, pubkey: 'bad' },
      { ...named, id: 'bad' }, { ...named, tags: named.tags.filter(tag => tag[0] !== 'x') },
      { ...named, tags: [...named.tags, ['x', 'd'.repeat(64)]] },
      { ...named, tags: named.tags.filter(tag => tag[0] !== 'd') },
      { ...named, kind: 15129 }, { ...named, kind: 5129 },
    ];
    expect(snapshot(createReferenceShell({ manifests: invalid }))).toEqual({ napplets: [], handlers: [] });
  });

  it('uses the same opaque target as intent discovery and implicit dispatch, including fallback', () => {
    const second = { ...named, pubkey: 'd'.repeat(64) };
    const preferences: Record<string, string>[] = [{}, { note: `named:${second.pubkey}:noteview` }];
    for (const defaults of preferences) {
      const shell = createReferenceShell({ manifests: [named, second], defaults });
      const result = snapshot(shell);
      const current = result.handlers.find(handler => handler.archetype === 'note')!.currentHandler;
      const [available] = shell.handle({ type: 'intent.available', id: 'a1', archetype: 'note' }) as Array<{ availability: { candidates: { id: string }[] } }>;
      expect(available.availability.candidates.map(candidate => candidate.id)).toEqual(result.napplets.map(entry => entry.id));
      const [invoked] = shell.handle({ type: 'intent.invoke', id: 'i1', request: { archetype: 'note', action: 'open', convention: 'napplet:note/open' } }) as Array<{ result: { handler: string } }>;
      expect(invoked.result.handler).toBe(current);
    }
  });

  it('does not substitute another target when caller policy hides the selected handler', () => {
    const second = { ...named, pubkey: 'd'.repeat(64), tags: [...named.tags, ['z', 'visible']] };
    const shell = createReferenceShell({ manifests: [named, second], catalogFilter: (entry, endpoint) => endpoint.id === 'visible' || entry.id !== selector });
    const result = snapshot(shell);
    expect(result.napplets).toHaveLength(1);
    expect(result.handlers.find(handler => handler.archetype === 'note')?.currentHandler).toBeNull();
    const [all] = shell.handleFrom({ id: 'visible', catalogId: 'viewer' }, { type: 'catalog.get', id: 'all' }) as Array<{ snapshot: CatalogSnapshot }>;
    expect(all.snapshot.napplets).toHaveLength(2);
  });

  it('returns metadata without an intent resolver or caller intent grant', () => {
    const shell = createReferenceShell({ manifests: [named], intentResolver: false });
    expect(snapshot(shell).handlers.every(handler => handler.currentHandler === null)).toBe(true);
    const endpoint = { id: 'catalog-only', catalogId: 'viewer', domains: ['catalog'] };
    const withResolver = createReferenceShell({ manifests: [named] });
    const [result] = withResolver.handleFrom(endpoint, { type: 'catalog.get', id: 'only' }) as Array<{ snapshot: CatalogSnapshot }>;
    expect(result.snapshot.handlers[0].currentHandler).toBe(selector);
    expect(withResolver.handleFrom(endpoint, { type: 'intent.available', id: 'a', archetype: 'note' })).toEqual([]);
  });

  it('keeps selectors stable across resolved versions and returns unique entries', () => {
    const manifests = [named, named];
    const shell = createReferenceShell({ manifests });
    expect(snapshot(shell).napplets).toHaveLength(1);
    manifests.splice(0, 2, { ...named, id: 'e'.repeat(64), tags: named.tags.map(tag => tag[0] === 'x' ? ['x', 'f'.repeat(64)] : tag) });
    const entry = snapshot(shell).napplets[0];
    expect(entry.id).toBe(selector);
    expect(entry.identity.eventId).toBe('e'.repeat(64));
    expect(entry.identity.artifactHash).toBe('f'.repeat(64));
  });

  it('returns detached snapshots and reports construction errors without leaking internals', () => {
    const shell = createReferenceShell({ manifests: [named] });
    const first = snapshot(shell);
    first.napplets[0].archetypes[0].intents[0].parameters.push('mutated');
    expect(snapshot(shell).napplets[0].archetypes[0].intents[0].parameters).toEqual(['id']);
    const broken = createReferenceShell({ catalogFilter: () => { throw new Error('private failure'); } });
    expect(broken.handle({ type: 'catalog.get', id: 'error' })).toEqual([{ type: 'catalog.get.result', id: 'error', error: 'catalog unavailable' }]);
  });
});
