/**
 * Tests for NAP registration and message dispatch infrastructure.
 *
 * Covers: registerNap, dispatch, getRegisteredDomains, createDispatch factory.
 */

import { describe, it, expect } from 'vitest';

import { createDispatch, registerNap, dispatch, getRegisteredDomains } from './dispatch.js';
import type { NappletMessage } from './envelope.js';

// ─── createDispatch Factory ───────────────────────────────────────────────

describe('createDispatch()', () => {
  it('returns registerNap, dispatch, and getRegisteredDomains', () => {
    const d = createDispatch();
    expect(typeof d.registerNap).toBe('function');
    expect(typeof d.dispatch).toBe('function');
    expect(typeof d.getRegisteredDomains).toBe('function');
  });

  it('factory instances are isolated from each other', () => {
    const d1 = createDispatch();
    const d2 = createDispatch();

    const calls: NappletMessage[] = [];
    d1.registerNap('relay', (msg) => calls.push(msg));

    // d2 should not have relay registered
    expect(d2.dispatch({ type: 'relay.subscribe' })).toBe(false);
    expect(calls.length).toBe(0);

    // d1 should have it
    expect(d1.dispatch({ type: 'relay.subscribe' })).toBe(true);
    expect(calls.length).toBe(1);
  });
});

// ─── registerNap ──────────────────────────────────────────────────────────

describe('registerNap()', () => {
  it('stores a handler for the given domain', () => {
    const d = createDispatch();
    let called = false;
    d.registerNap('relay', () => { called = true; });

    d.dispatch({ type: 'relay.subscribe' });
    expect(called).toBe(true);
  });

  it('throws when domain is already registered', () => {
    const d = createDispatch();
    d.registerNap('relay', () => {});

    expect(() => d.registerNap('relay', () => {})).toThrowError(
      'NAP domain "relay" is already registered'
    );
  });
});

// ─── dispatch ─────────────────────────────────────────────────────────────

describe('dispatch()', () => {
  it('calls the correct handler and returns true', () => {
    const d = createDispatch();
    const received: NappletMessage[] = [];
    d.registerNap('relay', (msg) => received.push(msg));

    const msg: NappletMessage = { type: 'relay.subscribe' };
    const result = d.dispatch(msg);

    expect(result).toBe(true);
    expect(received.length).toBe(1);
    expect(received[0]).toEqual(msg);
  });

  it('returns false when no handler is registered for the domain', () => {
    const d = createDispatch();

    const result = d.dispatch({ type: 'identity.getPublicKey' });
    expect(result).toBe(false);
  });

  it('returns false when type has no dot (no domain match)', () => {
    const d = createDispatch();
    d.registerNap('relay', () => {});

    const result = d.dispatch({ type: 'malformed' });
    expect(result).toBe(false);
  });

  it('returns false when type has empty domain prefix', () => {
    const d = createDispatch();
    d.registerNap('relay', () => {});

    const result = d.dispatch({ type: '.action' });
    expect(result).toBe(false);
  });

  it('dispatches to the correct handler among multiple domains', () => {
    const d = createDispatch();
    const relayCalls: NappletMessage[] = [];
    const identityCalls: NappletMessage[] = [];

    d.registerNap('relay', (msg) => relayCalls.push(msg));
    d.registerNap('identity', (msg) => identityCalls.push(msg));

    d.dispatch({ type: 'relay.subscribe' });
    d.dispatch({ type: 'identity.getPublicKey' });
    d.dispatch({ type: 'relay.publish' });

    expect(relayCalls.length).toBe(2);
    expect(identityCalls.length).toBe(1);
    expect(identityCalls[0]!.type).toBe('identity.getPublicKey');
  });
});

// ─── getRegisteredDomains ─────────────────────────────────────────────────

describe('getRegisteredDomains()', () => {
  it('returns empty array when no domains registered', () => {
    const d = createDispatch();
    expect(d.getRegisteredDomains()).toEqual([]);
  });

  it('returns array of registered domain strings', () => {
    const d = createDispatch();
    d.registerNap('relay', () => {});
    d.registerNap('identity', () => {});

    const domains = d.getRegisteredDomains();
    expect(domains.length).toBe(2);
    expect(domains).toContain('relay');
    expect(domains).toContain('identity');
  });
});

// ─── Module-level singleton ───────────────────────────────────────────────

describe('module-level singleton exports', () => {
  it('registerNap, dispatch, getRegisteredDomains are functions', () => {
    expect(typeof registerNap).toBe('function');
    expect(typeof dispatch).toBe('function');
    expect(typeof getRegisteredDomains).toBe('function');
  });
});
