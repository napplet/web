import { describe, expect, it } from 'vitest';
import { dedupeRelays, normalizeRelayUrl } from '../src/relay-url.ts';

describe('normalizeRelayUrl', () => {
  it.each([
    ['wss://Relay.Example/', 'wss://relay.example'],
    ['wss://relay.example:443', 'wss://relay.example'],
    ['wss://relay.example:7777/', 'wss://relay.example:7777'],
    ['  wss://relay.example/nostr/  ', 'wss://relay.example/nostr'],
    ['wss://relay.example/?x=1#y', 'wss://relay.example'],
    ['wss://relay.example.', 'wss://relay.example'],
  ])('%s → %s', (input, expected) => expect(normalizeRelayUrl(input)).toBe(expected));

  it.each([
    'https://relay.example', 'ws://relay.example', 'wss://user:pw@relay.example', 'wss://localhost', 'wss://127.0.0.1',
    'wss://10.1.2.3', 'wss://192.168.1.1', 'wss://172.20.0.1', 'wss://[::1]', 'wss://box.local', 'wss://abc.onion', 'wss://intranet',
    'not a url', '', 42, null,
  ])('rejects %s', input => expect(normalizeRelayUrl(input)).toBeNull());

  it('allows private and plaintext relays when asked', () => {
    expect(normalizeRelayUrl('ws://127.0.0.1:7000/', { allowPrivateHosts: true })).toBe('ws://127.0.0.1:7000');
  });
});

describe('dedupeRelays', () => {
  it('drops duplicates and invalid entries, keeping first-seen order', () => {
    expect(dedupeRelays(['wss://b.example', 'wss://A.example/', 'wss://a.example', 'bogus', 'wss://b.example:443'])).toEqual(['wss://b.example', 'wss://a.example']);
  });
});
