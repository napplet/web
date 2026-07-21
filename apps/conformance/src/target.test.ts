import { describe, it, expect } from 'vitest';
import { nip19 } from 'nostr-tools';
import { NAPPLET_KIND_NAMED, NAPPLET_KIND_SNAPSHOT, type NappletManifestEvent } from '@napplet/conformance';
import { computeAggregateHash, decodeNappletPointer, isHttpTarget } from './target.js';

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

describe('manifest aggregate hashing', () => {
  it('hashes sorted path-tag pairs only', async () => {
    const event: NappletManifestEvent = {
      kind: NAPPLET_KIND_NAMED,
      tags: [
        ['d', 'demo'],
        ['path', '/b.js', 'b'.repeat(64)],
        ['title', 'ignored'],
        ['path', '/index.html', 'a'.repeat(64)],
      ],
    };
    const expected = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`${'a'.repeat(64)} /index.html\n${'b'.repeat(64)} /b.js\n`),
    );
    const expectedHex = [...new Uint8Array(expected)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    await expect(computeAggregateHash(event)).resolves.toBe(expectedHex);
  });
});
