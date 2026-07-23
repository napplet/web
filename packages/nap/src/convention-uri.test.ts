import { describe, expect, it } from 'vitest';
import { normalizeConventionUri } from './convention-uri.js';

describe('normalizeConventionUri', () => {
  it('derives identity from a queryless convention and preserves opaque payload', () => {
    const payload = { pubkey: 'abc123', nested: { value: true } };

    expect(normalizeConventionUri('napplet:profile/open', payload)).toEqual({
      archetype: 'profile',
      action: 'open',
      convention: 'napplet:profile/open',
      payload,
    });
  });

  it('transposes a query into a shallow decoded text payload', () => {
    expect(normalizeConventionUri('napplet:profile/open?pubkey=abc%20123&marker=a+b')).toEqual({
      archetype: 'profile',
      action: 'open',
      convention: 'napplet:profile/open',
      payload: { pubkey: 'abc 123', marker: 'a+b' },
    });
  });

  it('keeps query text literal without scalar or form decoding', () => {
    expect(normalizeConventionUri('napplet:note/open?plus=a+b&escaped=%2B&boolean=true&number=42')).toEqual({
      archetype: 'note',
      action: 'open',
      convention: 'napplet:note/open',
      payload: { plus: 'a+b', escaped: '+', boolean: 'true', number: '42' },
    });
  });

  it.each([
    ['fragment', 'napplet:profile/open#details', undefined],
    ['malformed name escape', 'napplet:profile/open?%E0%A4=value', undefined],
    ['malformed value escape', 'napplet:profile/open?name=%E0%A4', undefined],
    ['missing equals separator', 'napplet:profile/open?name', undefined],
    ['repeated raw name', 'napplet:profile/open?a=one&a=two', undefined],
    ['repeated decoded name', 'napplet:profile/open?%61=one&a=two', undefined],
    ['query with explicit payload', 'napplet:profile/open?pubkey=abc123', {}],
  ])('rejects a %s', (_name, uri, payload) => {
    expect(() => normalizeConventionUri(uri, payload)).toThrow();
  });
});
