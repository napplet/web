import { describe, expect, it } from 'vitest';
import { getPublicKey } from 'nostr-tools/pure';
import { parseIntentUri, parseRelease, releaseKey } from './release';
import { alice, named, snapshot } from '../test/fixtures';

describe('parseIntentUri', () => {
  it.each([
    ['napplet:note/open', { archetype: 'note', verb: 'open' }],
    ['napplet:black-site/map-edit', { archetype: 'black-site', verb: 'map-edit' }],
    ['napplet:3d-model/open', { archetype: '3d-model', verb: 'open' }],
  ])('%s', (uri, parts) => expect(parseIntentUri(uri)).toEqual(parts));

  it.each(['napplet:note/open?pubkey=1', 'napplet:note/open#x', 'napplet:note', 'napplet:Note/open', 'nostr:note/open', 'napplet:note/open/extra', 'napplet:/open'])('rejects %s', uri => {
    expect(parseIntentUri(uri)).toBeNull();
  });
});

describe('parseRelease', () => {
  it('reads z and i tags, parameters, domains and title', () => {
    const event = named('viewer', [['z', '3d-model'], ['z', '3d-model'], ['z', 'Bad Name'], ['i', 'napplet:3d-model/open', 'url', 'sha256', 'url', ''], ['i', 'napplet:bad'], ['R', 'relay'], ['O', 'storage'], ['R', 'NAP-RELAY']], { title: ' Viewer ' });
    const release = parseRelease(event, ['wss://a', 'wss://b', 'wss://c', 'wss://d'])!;
    expect(release).toMatchObject({
      key: `35129:${getPublicKey(alice)}:viewer`, identifier: 'viewer', title: 'Viewer',
      archetypes: ['3d-model'], requires: ['relay'], optional: ['storage'], relays: ['wss://a', 'wss://b', 'wss://c'],
    });
    expect(release.intents).toEqual([{ uri: 'napplet:3d-model/open', archetype: '3d-model', verb: 'open', params: ['url', 'sha256'] }]);
  });

  it('falls back to the identifier for a title and reads snapshot lineage', () => {
    expect(parseRelease(named('plain', []))?.title).toBe('plain');
    const parent = `35129:${'c'.repeat(64)}:viewer`;
    const release = parseRelease(snapshot([['a', parent], ['A', 'bogus']]))!;
    expect(release.parent).toBe(parent);
    expect(release.root).toBeUndefined();
    expect(release.key).toBe(release.id);
  });

  it('rejects malformed manifests', () => {
    const good = named('x', []);
    expect(parseRelease({ ...good, kind: 1 })).toBeNull();
    expect(parseRelease({ ...good, content: '  ' })).toBeNull();
    expect(parseRelease({ ...good, tags: [['d', 'x']] })).toBeNull();
    expect(parseRelease({ ...good, tags: [['d', 'x'], ['x', 'b'.repeat(64), 'extra']] })).toBeNull();
    expect(parseRelease({ ...good, tags: [['x', 'b'.repeat(64)]] })).toBeNull();
    expect(parseRelease({ ...good, kind: 15129 })).toBeNull();
    expect(parseRelease({ ...good, tags: [['d', 'x'], ['x', 'b'.repeat(64)], ['z', 1 as unknown as string]] })).toBeNull();
  });

  it('keys root manifests by author', () => {
    expect(releaseKey({ id: 'i', kind: 15129, pubkey: 'p', tags: [] })).toBe('15129:p:');
  });
});
