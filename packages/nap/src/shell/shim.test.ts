import { describe, it, expect } from 'vitest';
import { createShellEnvironment, makeSupports, defaultSupports } from './shim.js';

describe('createShellEnvironment', () => {
  it('parses a well-formed shell.init payload verbatim', () => {
    const env = createShellEnvironment({
      type: 'shell.init',
      capabilities: { domains: ['relay', 'inc'], protocols: { inc: ['NAP-2'] } },
      services: ['signer'],
    });
    expect(env.capabilities.domains).toEqual(['relay', 'inc']);
    expect(env.capabilities.protocols).toEqual({ inc: ['NAP-2'] });
    expect(env.services).toEqual(['signer']);
  });

  it('coerces missing fields to safe empties', () => {
    const env = createShellEnvironment({ type: 'shell.init' });
    expect(env.capabilities).toEqual({ domains: [], protocols: {} });
    expect(env.services).toEqual([]);
  });

  it('coerces malformed fields (non-arrays, non-objects)', () => {
    const env = createShellEnvironment({
      capabilities: { domains: 'relay', protocols: ['nope'] },
      services: { not: 'an array' },
    } as unknown as Record<string, unknown>);
    expect(env.capabilities.domains).toEqual([]);
    expect(env.capabilities.protocols).toEqual({});
    expect(env.services).toEqual([]);
  });

  it('drops non-string entries inside domains / protocols / services', () => {
    const env = createShellEnvironment({
      capabilities: { domains: ['relay', 5, null], protocols: { inc: ['NAP-2', 7] } },
      services: ['a', 1],
    } as unknown as Record<string, unknown>);
    expect(env.capabilities.domains).toEqual(['relay']);
    expect(env.capabilities.protocols).toEqual({ inc: ['NAP-2'] });
    expect(env.services).toEqual(['a']);
  });
});

describe('makeSupports', () => {
  const env = createShellEnvironment({
    capabilities: { domains: ['relay', 'inc'], protocols: { inc: ['NAP-2'] } },
    services: [],
  });
  const supports = makeSupports(env);

  it('returns true for an offered domain', () => {
    expect(supports('relay')).toBe(true);
    expect(supports('inc')).toBe(true);
  });

  it('returns false for an unknown domain', () => {
    expect(supports('unknown')).toBe(false);
  });

  it('returns true only for an offered protocol within a domain', () => {
    expect(supports('inc', 'NAP-2')).toBe(true);
    expect(supports('inc', 'NAP-99')).toBe(false);
  });

  it('returns false for a protocol on a domain that lists none', () => {
    expect(supports('relay', 'NAP-2')).toBe(false);
  });
});

describe('defaultSupports', () => {
  it('returns false for everything (pre-init)', () => {
    expect(defaultSupports('relay')).toBe(false);
    expect(defaultSupports('inc', 'NAP-2')).toBe(false);
    expect(defaultSupports('unknown')).toBe(false);
  });
});
