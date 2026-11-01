import { describe, expect, it } from 'vitest';
import { finalizeEvent, generateSecretKey, getPublicKey, type Event } from 'nostr-tools/pure';
import { catalogApp, withListings } from './catalog';
import { releaseCardHtml } from './card';
import { isSafeMediaUrl } from './media';
import { choosePreview, previewTargets, screenshotLabel, withNapshot } from './napshot';
import config from '../data/discovery.json';
import snapshot from '../data/discovered-apps.json';

const author = generateSecretKey();
const napshot = generateSecretKey();
const stranger = generateSecretKey();
const signer = getPublicKey(napshot);
const hash = (character: string) => character.repeat(64);
const manifest = (changes: Record<string, unknown> = {}) => finalizeEvent({ kind: 35129, created_at: 100, content: 'An app', tags: [['d', 'fixture'], ['x', hash('a')], ['title', 'Fixture'], ['server', 'https://blossom.example']], ...changes }, author);
const shot = (sha = hash('b')) => ['screenshot', `x ${sha}`, 'm image/png', 'dim 1200x750', 'size 4096'];

/** A label exactly as Napshot publishes it, with overridable parts. */
function label(target: Event, options: { key?: Uint8Array; tags?: string[][]; drop?: string[]; created_at?: number } = {}): Event {
  const identifier = target.kind === 35129 ? target.tags.find(tag => tag[0] === 'd')![1] : '';
  const base = [
    ['L', '#screenshot'], ['l', hash('b'), '#screenshot'], ['e', target.id, 'wss://relay.example'],
    ['a', `${target.kind}:${target.pubkey}:${identifier}`], ['p', target.pubkey], shot(),
    ['server', 'https://cdn.one.example'], ['server', 'https://cdn.two.example/blobs/'],
  ].filter(tag => !options.drop?.includes(tag[0]));
  return finalizeEvent({ kind: 1985, created_at: options.created_at ?? 200, content: 'Signed-out napplet preview captured by Napshot.', tags: [...base, ...(options.tags ?? [])] }, options.key ?? napshot);
}

describe('Napshot label verification', () => {
  const named = manifest();
  it('accepts a trusted label for the exact named or root revision and keeps mirror base paths', () => {
    const preview = screenshotLabel(label(named), named, [signer])!;
    expect(preview).toMatchObject({ sha256: hash('b'), type: 'image/png', dim: '1200x750', size: 4096, signer });
    expect(preview.servers).toEqual(['https://cdn.one.example', 'https://cdn.two.example/blobs']);
    const root = manifest({ kind: 15129, tags: [['x', hash('a')]] });
    expect(screenshotLabel(label(root), root, [signer])).not.toBeNull();
  });
  it('never labels snapshots and never trusts an empty signer list', () => {
    const pinned = manifest({ kind: 5129, tags: [['x', hash('a')]] });
    expect(screenshotLabel(label(pinned), pinned, [signer])).toBeNull();
    expect(screenshotLabel(label(named), named, [])).toBeNull();
  });
  it('rejects bad signatures, untrusted signers, wrong kinds and wrong targets', () => {
    const good = label(named);
    expect(screenshotLabel(JSON.parse(JSON.stringify({ ...good, content: 'tampered' })), named, [signer])).toBeNull();
    expect(screenshotLabel(label(named, { key: stranger }), named, [signer])).toBeNull();
    expect(screenshotLabel(finalizeEvent({ ...good, kind: 1, created_at: 1 }, napshot), named, [signer])).toBeNull();
    const other = manifest({ created_at: 101 });
    expect(screenshotLabel(good, other, [signer]), 'a label for the previous revision does not follow an update').toBeNull();
    expect(screenshotLabel(label(named, { drop: ['e'] }), named, [signer]), 'a stale `a`-only match is ignored').toBeNull();
    expect(screenshotLabel(label(named, { tags: [['e', other.id]] }), named, [signer]), 'ambiguous `e` targets are rejected').toBeNull();
    expect(screenshotLabel(label(named, { drop: ['a'], tags: [['a', `35129:${named.pubkey}:other`]] }), named, [signer])).toBeNull();
    expect(screenshotLabel(label(named, { drop: ['p'], tags: [['p', signer]] }), named, [signer])).toBeNull();
    expect(screenshotLabel(label(named, { drop: ['L'] }), named, [signer])).toBeNull();
  });
  it('rejects duplicate or contradictory screenshot fields and label/hash mismatches', () => {
    const variants = [
      ['screenshot', `x ${hash('b')}`, `x ${hash('c')}`, 'm image/png', 'dim 1200x750', 'size 4096'],
      ['screenshot', `x ${hash('b')}`, 'm image/png', 'm image/png', 'dim 1200x750', 'size 4096'],
      ['screenshot', `x ${hash('b')}`, 'm image/jpeg', 'dim 1200x750', 'size 4096'],
      ['screenshot', `x ${hash('B')}`, 'm image/png', 'dim 1200x750', 'size 4096'],
      ['screenshot', `x ${hash('b')}`, 'm image/png', 'dim 0x750', 'size 4096'],
      ['screenshot', `x ${hash('b')}`, 'm image/png', 'dim 99999x750', 'size 4096'],
      ['screenshot', `x ${hash('b')}`, 'm image/png', 'dim 1200x750', 'size 99999999999'],
      ['screenshot', `x ${hash('b')}`, 'm image/png', 'dim 1200x750', 'size 01'],
      ['screenshot', hash('b')],
    ];
    for (const tag of variants) expect(screenshotLabel(label(named, { drop: ['screenshot'], tags: [tag] }), named, [signer]), tag.join(',')).toBeNull();
    expect(screenshotLabel(label(named, { tags: [shot()] }), named, [signer]), 'two screenshot tags').toBeNull();
    expect(screenshotLabel(label(named, { drop: ['l'], tags: [['l', hash('c'), '#screenshot']] }), named, [signer])).toBeNull();
  });
  it('drops unsafe mirrors and rejects a label with none left', () => {
    const unsafe = ['http://cdn.example', 'https://user:pass@cdn.example', 'https://localhost', 'https://192.168.1.4', 'https://10.0.0.1', 'https://[::1]', 'https://printer.local', 'https://intranet', 'javascript:alert(1)'];
    expect(screenshotLabel(label(named, { drop: ['server'], tags: unsafe.map(url => ['server', url]) }), named, [signer])).toBeNull();
    const mixed = screenshotLabel(label(named, { tags: [['server', 'http://cdn.example'], ['server', 'https://cdn.one.example/']] }), named, [signer])!;
    expect(mixed.servers).toEqual(['https://cdn.one.example', 'https://cdn.two.example/blobs']);
    for (const url of unsafe) expect(isSafeMediaUrl(url), url).toBe(false);
    expect(isSafeMediaUrl('https://cdn.hzrd149.com')).toBe(true);
  });
  it('chooses by signer preference, then newest, then lowest id', () => {
    const second = generateSecretKey();
    const secondKey = getPublicKey(second);
    const signers = [signer, secondKey];
    const newer = screenshotLabel(label(named, { created_at: 300 }), named, signers)!;
    const older = screenshotLabel(label(named, { created_at: 250 }), named, signers)!;
    const preferredOther = screenshotLabel(label(named, { key: second, created_at: 900 }), named, signers)!;
    expect(choosePreview([{ preview: preferredOther, createdAt: 900 }, { preview: older, createdAt: 250 }, { preview: newer, createdAt: 300 }], signers)).toBe(newer);
  });
});

describe('attaching previews to catalog entries', () => {
  it('keeps author screenshots first and only labels root/named releases without one', () => {
    const plain = manifest();
    const withShot = manifest({ tags: [['d', 'shot'], ['x', hash('a')], ['screenshot', `x ${hash('d')}`, 'm image/png'], ['server', 'https://blossom.example']] });
    const pinned = manifest({ kind: 5129, tags: [['x', hash('e')]] });
    const apps = [plain, withShot, pinned].map(event => catalogApp(event)!);
    expect(previewTargets(apps)).toEqual([plain.id]);
    const [a, b, c] = withNapshot(apps, [label(plain), label(withShot), label(pinned)], [signer]);
    expect(a.napshot?.sha256).toBe(hash('b'));
    expect(b.napshot).toBeUndefined();
    expect(c.napshot).toBeUndefined();
    expect(withNapshot(apps, [label(plain)], [])[0].napshot, 'empty trust list').toBeUndefined();
    expect(withNapshot(apps, [label(plain, { key: stranger })], [signer])[0].napshot, 'untrusted signer').toBeUndefined();
    expect(withNapshot(apps, [null, 5, { tags: 'x' }], [signer])[0].napshot).toBeUndefined();
  });
  it('carries the preview in card media only when no publisher imagery exists', () => {
    const plain = manifest();
    const [app] = withNapshot([catalogApp(plain)!], [label(plain)], [signer]);
    const unescape = (value: string) => value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    const media = (html: string) => JSON.parse(unescape(/data-media="([^"]*)"/.exec(html)![1]));
    expect(media(releaseCardHtml(app, 0)).napshot).toMatchObject({ sha256: hash('b'), size: 4096, dim: '1200x750', signer });
    const listed = finalizeEvent({ kind: 32267, created_at: 100, content: '', tags: [['d', 'fixture-1'], ['name', 'Fixture'], ['image', 'https://art.example/a.png']] }, author);
    const [withArt] = withNapshot(withListings([catalogApp(plain)!], [listed]), [label(plain)], [signer]);
    expect(media(releaseCardHtml(withArt, 0)).napshot).toBeNull();
  });
  it('verifies the saved labels against the saved snapshot with the configured signer', () => {
    const labels = (snapshot as { labels?: Event[] }).labels ?? [];
    expect(config.screenshotLabelers.length).toBeGreaterThan(0);
    const apps = withNapshot(snapshot.events.map(event => catalogApp(event)).filter(app => app !== null), labels, config.screenshotLabelers);
    for (const event of labels) expect(config.screenshotLabelers).toContain(event.pubkey);
    expect(apps.filter(app => app.napshot).length).toBe(new Set(labels.map(event => event.tags.find(tag => tag[0] === 'e')![1])).size);
  });
});
