import { describe, expect, it } from 'vitest';
import { isBareDomainName, isRegistryDomain, normalizeExperimentalDomains } from './experimental-domains.js';

// NIP-5D §Required and Optional Capabilities: "Each tag names one bare NAP domain (e.g. `relay`, never `NAP-RELAY`)".
describe('isBareDomainName', () => {
  it.each(['relay', 'mesh', 'my-proto', 'x1'])('accepts %s', (name) => {
    expect(isBareDomainName(name)).toBe(true);
  });

  it.each(['', 'NAP-RELAY', 'foo.bar', 'a b', 'tab\tname', 'ns:foo'])('rejects %j', (name) => {
    expect(isBareDomainName(name)).toBe(false);
  });
});

describe('normalizeExperimentalDomains', () => {
  it('trims, deduplicates, and keeps order', () => {
    expect(normalizeExperimentalDomains([' mesh ', 'proto', 'mesh'])).toEqual(['mesh', 'proto']);
    expect(normalizeExperimentalDomains(undefined)).toEqual([]);
  });

  it('refuses to shadow a bundled NAP domain', () => {
    expect(isRegistryDomain('relay')).toBe(true);
    expect(() => normalizeExperimentalDomains(['relay'])).toThrow('is a NAP domain');
  });

  it.each(['__proto__', 'constructor', 'hasOwnProperty'])('refuses prototype member %s', (name) => {
    expect(() => normalizeExperimentalDomains([name])).toThrow('cannot be used');
  });

  it('refuses non-bare names', () => {
    expect(() => normalizeExperimentalDomains(['foo.bar'])).toThrow('not a bare domain');
  });
});
