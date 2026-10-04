import { describe, it, expect } from 'vitest';
import { nip19 } from 'nostr-tools';
import { NAPPLET_KIND_NAMED, NAPPLET_KIND_SNAPSHOT, type NappletManifestEvent } from '@napplet/conformance';
import { fetchIndexHtml, resolveTarget, decodeNappletPointer, isHttpTarget } from './target.js';

const PUBKEY = 'a'.repeat(64);
const ID = 'b'.repeat(64);
const RELAY = 'wss://relay.example/';

describe('target parsing', () => {
  it('recognizes local HTTP URL fallback targets', () => {
    expect(isHttpTarget('https://localhost:5173/')).toBe(true);
    expect(isHttpTarget('http://127.0.0.1:5173/')).toBe(true);
    expect(isHttpTarget('naddr1qq')).toBe(false);
  });

  it('decodes a named napplet naddr into a relay query filter', () => {
    const pointer = nip19.naddrEncode({
      identifier: 'demo',
      pubkey: PUBKEY,
      kind: NAPPLET_KIND_NAMED,
      relays: [RELAY],
    });
    const decoded = decodeNappletPointer(pointer);
    expect(decoded.type).toBe('naddr');
    expect(decoded.relays).toEqual([RELAY]);
    expect(decoded.filter).toMatchObject({
      kinds: [NAPPLET_KIND_NAMED],
      authors: [PUBKEY],
      '#d': ['demo'],
    });
  });

  it('decodes napplet nevent pointers and rejects non-napplet kinds', () => {
    const pointer = nip19.neventEncode({ id: ID, kind: NAPPLET_KIND_SNAPSHOT, relays: [RELAY] });
    expect(decodeNappletPointer(pointer).filter).toMatchObject({
      ids: [ID],
      kinds: [NAPPLET_KIND_SNAPSHOT],
    });

    const bad = nip19.neventEncode({ id: ID, kind: 1, relays: [RELAY] });
    expect(() => decodeNappletPointer(bad)).toThrow(/not a NIP-5D napplet/);
  });

  it('requires relay hints rather than inventing discovery defaults', () => {
    const pointer = nip19.neventEncode({ id: ID, kind: NAPPLET_KIND_SNAPSHOT });
    expect(() => decodeNappletPointer(pointer)).toThrow(/relay hints/);
  });
});

describe('artifact verification', () => {
  const html = '<!doctype html><title>Verified napplet</title>';
  async function manifest(): Promise<NappletManifestEvent> {
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(html)))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return { kind: NAPPLET_KIND_NAMED, content: 'A verified napplet', tags: [['d', 'demo'], ['x', hash], ['server', 'https://blossom.example']] };
  }

  it('fetches by direct x hash and verifies the exact artifact bytes', async () => {
    const event = await manifest();
    const fetcher: typeof fetch = async (url) => {
      expect(String(url)).toBe(`https://blossom.example/${event.tags[1][1]}`);
      return new Response(html);
    };
    await expect(fetchIndexHtml(event, fetcher)).resolves.toBe(html);
    await expect(fetchIndexHtml(event, async () => new Response('tampered'))).rejects.toThrow(/did not match/);
  });

  it('rejects missing, duplicate, uppercase and legacy x before fetching', async () => {
    const original = await manifest();
    for (const hashes of [[], [['x', 'A'.repeat(64)]], [original.tags[1], original.tags[1]], [['x', original.tags[1][1], 'aggregate']]]) {
      const event = { ...original, tags: [['d', 'demo'], ...hashes] };
      await expect(fetchIndexHtml(event, async () => { throw new Error('unexpected fetch'); })).rejects.toThrow(/exactly one x/);
    }
  });

  it('resolves a signed event through the complete reader path', async () => {
    const { finalizeEvent } = await import('nostr-tools/pure');
    const template = await manifest();
    const event = finalizeEvent({ kind: template.kind, tags: template.tags, content: template.content!, created_at: 1 }, new Uint8Array(32).fill(1));
    const pointer = nip19.neventEncode({ id: event.id, relays: [RELAY] });
    const result = await resolveTarget(pointer, { pool: { get: async () => event, destroy: () => {} }, fetcher: async () => new Response(html), createObjectUrl: () => 'blob:test' });
    expect(result.html).toBe(html);
    expect(result.manifestEvent?.content).toBe(template.content);
  });
});
