import { describe, expect, it } from 'vitest';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { npubEncode } from 'nostr-tools/nip19';
import { applicationListing, authorProfile, catalogApp, collapseReleases, latestApps, matchListing, withListings, withProfiles } from './catalog';
import { releaseCardHtml, searchText } from './card';
import snapshot_data from '../data/discovered-apps.json';
const snapshot = snapshot_data;
const secret = generateSecretKey();
const hash = (character: string) => character.repeat(64);
const sign = (changes: Record<string, unknown> = {}) => finalizeEvent({ kind: 35129, created_at: 100, content: '<img src=x onerror=alert(1)> is plain text', tags: [['d', 'fixture'], ['x', hash('a')], ['title', 'A real test']], ...changes }, secret);
const listing = (tags: string[][], changes: Record<string, unknown> = {}) => finalizeEvent({ kind: 32267, created_at: 100, content: '**markdown**', tags, ...changes }, secret);

describe('catalog release selection', () => {
  // Verifying every signature in the growing snapshot can exceed 5s on shared CI runners.
  it('reads actual signed upstream current manifests without accepting historical aggregates', () => {
    const selected = snapshot.events.map(event => catalogApp(event)).filter(app => app !== null);
    expect(selected.length).toBeGreaterThan(10);
    expect(selected.some(app => app.name === 'Stick Brawl')).toBe(true);
    for (const event of snapshot.events.filter(event => event.tags.some(tag => tag[0] === 'x' && tag[2] === 'aggregate'))) expect(catalogApp(event)).toBeNull();
  }, 30_000);
  it('preserves publisher descriptions as text, signatures, requirements and address hints', () => {
    const event = sign({ tags: [['d', 'fixture'], ['x', hash('a')], ['R', 'storage'], ['O', 'theme']] });
    const app = catalogApp(event, ['wss://relay.example'])!;
    expect(app.description).toBe(event.content);
    expect(app.requirements).toEqual(['storage']);
    expect(app.optional).toEqual(['theme']);
    expect(app.pointer).toMatch(/^naddr1/);
    expect(app.coordinate).toBe(`35129:${event.pubkey}:fixture`);
    expect(app.event).toBe(event);
    expect(catalogApp(JSON.parse(JSON.stringify({ ...event, content: 'tampered' })))).toBeNull();
  });
  it('uses each own kind and rejects wrong d/x cardinalities and empty descriptions', () => {
    expect(catalogApp(sign({ kind: 5129, tags: [['x', hash('a')]] }))?.pointer).toMatch(/^nevent1/);
    expect(catalogApp(sign({ kind: 15129, tags: [['x', hash('a')]] }))?.pointer).toMatch(/^nevent1/);
    for (const changes of [{kind: 32267}, {content: ''}, {tags: [['x', hash('a')]]}, {kind: 15129}, {tags: [['d', 'x'], ['x', hash('a')], ['x', hash('b')]]}, {tags: [['d', 'x'], ['x', hash('a'), 'aggregate']]}, {created_at: 9e14}]) expect(catalogApp(sign(changes))).toBeNull();
  });
  it('keeps newest addressable releases and independent snapshots', () => {
    const older = catalogApp(sign())!;
    const newer = catalogApp(sign({ created_at: 101 }))!;
    const regular = catalogApp(sign({ kind: 5129, tags: [['x', hash('b')]] }))!;
    expect(latestApps([older, regular, newer, newer]).map(app => app.event.id)).toEqual([newer.event.id, regular.event.id]);
  });
});

describe('collapsing pinned versions', () => {
  const named = catalogApp(sign())!;
  const root = catalogApp(sign({ kind: 15129, tags: [['x', hash('c')], ['title', 'Root app']] }))!;
  const snapshot = (tags: string[][], created_at = 50) => catalogApp(sign({ kind: 5129, created_at, tags }))!;
  it('folds snapshots into the napplet their lineage names, newest activity first', () => {
    const pinned = snapshot([['x', hash('d')], ['a', named.coordinate!], ['title', 'A real test']], 200);
    const olderPin = snapshot([['x', hash('e')], ['a', named.coordinate!]], 20);
    const other = catalogApp(sign({ tags: [['d', 'other'], ['x', hash('f')], ['title', 'Other']], created_at: 150 }))!;
    const apps = collapseReleases(latestApps([named, pinned, olderPin, other]));
    expect(apps.map(app => [app.event.id, app.versions])).toEqual([[named.event.id, 2], [other.event.id, 0]]);
    expect(apps[0].activityAt).toBe(200);
  });
  it('falls back to publisher and title when a snapshot has no lineage, and keeps strangers independent', () => {
    const titled = snapshot([['x', hash('d')], ['title', ' a REAL test ']]);
    const stranger = snapshot([['x', hash('e')], ['title', 'Unrelated']]);
    const foreign = catalogApp(finalizeEvent({ kind: 5129, created_at: 60, content: 'text', tags: [['x', hash('9')], ['title', 'A real test']] }, generateSecretKey()))!;
    const apps = collapseReleases(latestApps([named, titled, stranger, foreign]));
    expect(apps.find(app => app.event.id === named.event.id)?.versions).toBe(1);
    expect(apps.map(app => app.event.id).sort()).toEqual([named.event.id, stranger.event.id, foreign.event.id].sort());
  });
  it('prefers a root over a named release and keeps snapshots of a missing parent together', () => {
    const rootPin = snapshot([['x', hash('d')], ['A', root.coordinate!], ['title', 'Root app']], 300);
    const orphanA = snapshot([['x', hash('1')], ['a', `35129:${named.author}:gone`]], 10);
    const orphanB = snapshot([['x', hash('2')], ['a', `35129:${named.author}:gone`]], 11);
    const apps = collapseReleases(latestApps([root, rootPin, orphanA, orphanB]));
    expect(apps.map(app => [app.event.kind, app.versions])).toEqual([[15129, 1], [5129, 1]]);
    expect(apps[1].event.id).toBe(orphanB.event.id);
  });
  it('collapses the real snapshot without listing any snapshot beside its named napplet', () => {
    const entries = latestApps(snapshot_events());
    const apps = collapseReleases(entries);
    const pins = entries.filter(app => app.event.kind === 5129).length;
    const standing = apps.filter(app => app.event.kind === 5129).length;
    for (const app of apps.filter(app => app.event.kind === 5129)) {
      expect(apps.some(other => other !== app && other.author === app.author && other.name.toLocaleLowerCase() === app.name.toLocaleLowerCase())).toBe(false);
    }
    expect(apps.reduce((sum, app) => sum + app.versions, 0)).toBe(pins - standing);
    expect(standing).toBeLessThan(pins);
    console.log(`collapse: ${entries.length} entries → ${apps.length} napplets, ${pins} pins, ${standing} standing alone`);
  });
  function snapshot_events() { return snapshot_data.events.map(event => catalogApp(event)).filter(app => app !== null); }
});

describe('manifest media per the current NIP-5D text', () => {
  it('reads a hash-addressed icon with a supported type and declared servers', () => {
    const app = catalogApp(sign({ tags: [['d', 'fixture'], ['x', hash('a')], ['icon', hash('b'), 'image/png'], ['server', 'https://blossom.example'], ['server', 'http://insecure.example']] }))!;
    expect(app.icon).toEqual({ sha256: hash('b'), type: 'image/png' });
    expect(app.servers).toEqual(['https://blossom.example']);
    expect(catalogApp(sign({ tags: [['d', 'fixture'], ['x', hash('a')], ['icon', hash('b'), 'image/svg+xml']] }))!.icon).toBeUndefined();
    expect(catalogApp(sign({ tags: [['d', 'fixture'], ['x', hash('a')], ['icon', 'not-a-hash', 'image/png']] }))!.icon).toBeUndefined();
  });
  it('keeps screenshots with exactly one valid x field, in order, and ignores malformed tags', () => {
    const app = catalogApp(sign({ tags: [
      ['d', 'fixture'], ['x', hash('a')],
      ['screenshot', `x ${hash('c')}`, 'm image/png', 'dim 1200x750', 'size 184320', 'alt The puzzle board'],
      ['screenshot', hash('d'), 'image/png'],
      ['screenshot', `x ${hash('e')}`, `x ${hash('f')}`],
      ['screenshot', 'm image/png'],
      ['screenshot', `x ${hash('9')}`, 'm image/webp', 'dim huge', 'm image/png'],
      ['preview', `x ${hash('1')}`, 'm video/webm'],
    ] }))!;
    expect(app.screenshots).toEqual([
      { sha256: hash('c'), type: 'image/png', dim: '1200x750', alt: 'The puzzle board' },
      { sha256: hash('9'), type: 'image/webp', dim: undefined, alt: undefined },
    ]);
    expect(app.preview).toEqual({ sha256: hash('1'), type: 'video/webm', dim: undefined, alt: undefined });
    const twoPreviews = catalogApp(sign({ tags: [['d', 'fixture'], ['x', hash('a')], ['preview', `x ${hash('1')}`], ['preview', `x ${hash('2')}`]] }))!;
    expect(twoPreviews.preview).toBeUndefined();
  });
  it('reads archetypes and topics for search and chips', () => {
    const app = catalogApp(sign({ tags: [['d', 'fixture'], ['x', hash('a')], ['z', 'game'], ['t', 'Puzzle'], ['t', 'game']] }))!;
    expect(app.archetypes).toEqual(['game']);
    expect(app.topics).toEqual(['puzzle', 'game']);
  });
});

describe('publisher profiles', () => {
  const napplet = catalogApp(sign())!;
  const profile = (content: unknown, changes: Record<string, unknown> = {}) => finalizeEvent({ kind: 0, created_at: 100, content: typeof content === 'string' ? content : JSON.stringify(content), tags: [], ...changes }, secret);
  it('reads a display name or name and an https picture from a signed kind 0 event, nothing else', () => {
    const full = authorProfile(profile({ name: 'alice', display_name: '  Alice <b>Example</b> ', picture: 'https://avatar.example/a.png', about: 'ignored' }))!;
    expect(full).toMatchObject({ name: 'Alice <b>Example</b>', picture: 'https://avatar.example/a.png', author: getPublicKey(secret) });
    expect(authorProfile(profile({ name: 'bob', picture: 'http://plain.example/b.png' }))).toMatchObject({ name: 'bob', picture: undefined });
    expect(authorProfile(profile({ picture: 'https://avatar.example/c.png' }))?.name).toBeUndefined();
    expect(authorProfile(profile({ name: 'x'.repeat(80) }))?.name).toHaveLength(60);
    expect(authorProfile(profile({ about: 'no name, no picture' }))).toBeNull();
    expect(authorProfile(profile('not json'))).toBeNull();
    expect(authorProfile(profile({ name: 'wrong kind' }, { kind: 1 }))).toBeNull();
    expect(authorProfile(JSON.parse(JSON.stringify({ ...profile({ name: 'tampered' }), content: '{"name":"evil"}' })))).toBeNull();
  });
  it('attaches the newest profile of the same publisher and leaves strangers alone', () => {
    const older = profile({ name: 'Old name' });
    const newer = profile({ name: 'New name' }, { created_at: 101 });
    const stranger = finalizeEvent({ kind: 0, created_at: 200, content: JSON.stringify({ name: 'Stranger' }), tags: [] }, generateSecretKey());
    expect(withProfiles([napplet], [newer, stranger, older])[0].profile).toMatchObject({ name: 'New name' });
    expect(withProfiles([napplet], [stranger])[0].profile).toBeUndefined();
  });
  it('renders the publisher as a nostr.at link with picture and name, escaped, or the short key without a profile', () => {
    const pubkey = getPublicKey(secret);
    const href = `https://nostr.at/${npubEncode(pubkey)}`;
    const named = withProfiles([napplet], [profile({ display_name: 'Alice <b>Example</b>', picture: 'https://avatar.example/a.png?size="16"' })])[0];
    const html = releaseCardHtml(named, 0);
    expect(html).toContain(`<a href="${href}" target="_blank" rel="noopener noreferrer" title="${pubkey}"`);
    expect(html).toContain('<img class="author-picture" src="https://avatar.example/a.png?size=&quot;16&quot;"');
    expect(html).toContain('<span>Alice &lt;b&gt;Example&lt;/b&gt;</span>');
    expect(html).not.toContain('<b>Example</b>');
    expect(searchText(named)).toContain('Alice <b>Example</b>');
    const bare = releaseCardHtml(napplet, 0);
    expect(bare).toContain(`<a href="${href}"`);
    expect(bare).toContain(`<span>${pubkey.slice(0, 8)}…${pubkey.slice(-6)}</span>`);
    expect(bare).not.toContain('author-picture');
  });
});

describe('application listing fallback', () => {
  const napplet = catalogApp(sign())!;
  it('accepts signed kind 32267 listings with https media only and keeps content out', () => {
    const event = listing([['d', 'fixture-0123456789abcdef'], ['name', 'A real test'], ['icon', 'https://blossom.example/icon'], ['image', 'http://plain.example/shot'], ['image', 'https://blossom.example/shot'], ['t', 'Game'], ['repository', 'https://git.example/repo'], ['license', 'MIT']]);
    const parsed = applicationListing(event)!;
    expect(parsed.icon).toBe('https://blossom.example/icon');
    expect(parsed.images).toEqual(['https://blossom.example/shot']);
    expect(parsed.topics).toEqual(['game']);
    expect(applicationListing(listing([['name', 'No identifier']]))).toBeNull();
    expect(applicationListing(JSON.parse(JSON.stringify({ ...event, content: 'tampered' })))).toBeNull();
  });
  it('matches by napplet address, identifier prefix or title from the same publisher, newest first', () => {
    const byAddress = listing([['d', 'anything'], ['name', 'Other'], ['latest', napplet.coordinate!, 'wss://relay.example']]);
    const byPrefix = listing([['d', 'fixture-abc'], ['name', 'Other']], { created_at: 101 });
    const byName = listing([['d', 'org.example'], ['name', 'a REAL test']], { created_at: 102 });
    const unrelated = listing([['d', 'fixture'], ['name', 'Other']]);
    const otherPublisher = finalizeEvent({ kind: 32267, created_at: 200, content: '', tags: [['d', 'fixture-abc'], ['name', 'A real test']] }, generateSecretKey());
    const listings = [byAddress, byPrefix, byName, unrelated, otherPublisher].map(applicationListing);
    expect(matchListing(napplet, listings)?.id).toBe('org.example');
    expect(matchListing(napplet, [applicationListing(unrelated), applicationListing(otherPublisher)])).toBeUndefined();
    expect(withListings([napplet], [byAddress])[0].listing?.id).toBe('anything');
  });
  it('pairs real snapshot releases with listings and renders escaped cards', () => {
    const apps = withListings(latestApps(snapshot.events.map(event => catalogApp(event)).filter(app => app !== null)), snapshot.applications);
    expect(apps.filter(app => app.listing).length).toBeGreaterThan(5);
    const html = releaseCardHtml(withListings([napplet], [listing([['d', 'fixture-1'], ['name', 'A real test'], ['image', 'https://blossom.example/shot']])])[0], 0);
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; is plain text');
    expect(html).toContain('src="https://blossom.example/shot"');
    expect(html).not.toContain('<img src=x');
  });
});
