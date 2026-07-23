import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRegisteredDomains } from '@napplet/core';
import {
  DOMAIN as INC_DOMAIN,
  emit,
  handleIncEvent,
  incEmit,
  incOn,
  installIncShim,
  on,
} from './inc/index.js';
import {
  DOMAIN as IFC_DOMAIN,
  handleIfcEvent,
  ifcEmit,
  ifcOn,
  installIfcShim,
} from './ifc/index.js';

beforeEach(() => {
  vi.stubGlobal('window', {
    parent: { postMessage: vi.fn() },
    napplet: { inc: { emit: vi.fn() } },
  });
});

afterEach(() => {
  installIncShim()();
  vi.unstubAllGlobals();
});

describe('deprecated IFC compatibility wrapper', () => {
  it('forwards to the canonical INC exports without registering an ifc domain', () => {
    expect(INC_DOMAIN).toBe('inc');
    expect(IFC_DOMAIN).toBe('inc');
    expect(installIfcShim).toBe(installIncShim);
    expect(handleIfcEvent).toBe(handleIncEvent);
    expect(ifcEmit).toBe(incEmit);
    expect(ifcOn).toBe(incOn);

    const domains = getRegisteredDomains();
    expect(domains).toContain('inc');
    expect(domains).not.toContain('ifc');
  });

  it('keeps the old shim subpath as an alias to inc emit/on functions', async () => {
    const ifcShim = await import('./ifc/shim.js');
    const incShim = await import('./inc/shim.js');

    expect(ifcShim.emit).toBe(emit);
    expect(ifcShim.emit).toBe(incShim.emit);
    expect(ifcShim.on).toBe(on);
    expect(ifcShim.on).toBe(incShim.on);
  });
});

describe('INC topic routing', () => {
  describe('emit convention URI transposition', () => {
    it('posts a stable topic with a shallow decoded text payload', () => {
      emit('napplet:profile/open?pubkey=abc%20123&marker=a+b');

      expect(window.parent.postMessage).toHaveBeenCalledWith({
        type: 'inc.emit',
        topic: 'napplet:profile/open',
        payload: { pubkey: 'abc 123', marker: 'a+b' },
      }, '*');
    });

    it.each([
      { payload: { pubkey: 'abc123' } },
      { payload: 'opaque text' },
      { payload: ['one', 'two'] },
      { payload: 42 },
      { payload: null },
    ])('forwards a queryless opaque payload unchanged: $payload', ({ payload }) => {
      emit('napplet:profile/open', payload);

      expect(window.parent.postMessage).toHaveBeenCalledWith({
        type: 'inc.emit',
        topic: 'napplet:profile/open',
        payload,
      }, '*');
    });

    it('forwards the clean-break incEmit payload without legacy arguments', () => {
      incEmit('napplet:note/open', { body: 'hello' });

      expect((window as { napplet: { inc: { emit: ReturnType<typeof vi.fn> } } }).napplet.inc.emit)
        .toHaveBeenCalledWith('napplet:note/open', { body: 'hello' });
    });
  });

  it('delivers a byte-identical topic with its payload and sender', () => {
    const received: Array<{ payload: unknown; sender: string; content: string }> = [];

    on('napplet:profile/open', (payload, event) => {
      received.push({ payload, sender: event.pubkey, content: event.content });
    });

    handleIncEvent({
      type: 'inc.event',
      topic: 'napplet:profile/open',
      sender: 'social-feed',
      payload: { pubkey: 'abc123' },
    });

    expect(received).toEqual([
      {
        payload: { pubkey: 'abc123' },
        sender: 'social-feed',
        content: JSON.stringify({ pubkey: 'abc123' }),
      },
    ]);
  });

  it('does not normalize, parse, prefix-match, wildcard-match, or case-fold topics', () => {
    const handler = vi.fn();
    on('napplet:profile/caf\u00e9', handler);

    for (const topic of [
      'napplet:profile/caf\u00e9?pubkey=abc123',
      'prefix/napplet:profile/caf\u00e9',
      'napplet:profile/caf\u00e9/suffix',
      'napplet:profile/*',
      'napplet:profile/CAF\u00c9',
      'napplet:profile/cafe\u0301',
    ]) {
      handleIncEvent({ type: 'inc.event', topic, sender: 'social-feed', payload: {} });
    }

    expect(handler).not.toHaveBeenCalled();
  });

  it('retains existing defaults when a matching event omits payload and sender', () => {
    const received: Array<{ payload: unknown; sender: string; content: string }> = [];
    on('napplet:dm/open', (payload, event) => {
      received.push({ payload, sender: event.pubkey, content: event.content });
    });

    handleIncEvent({ type: 'inc.event', topic: 'napplet:dm/open' } as never);

    expect(received).toEqual([{ payload: {}, sender: '', content: JSON.stringify({}) }]);
  });
});
