import { describe, expect, it, vi } from 'vitest';
import { navigation } from '@napplet/sdk/navigation';
import { installNappletRuntimePrelude } from './prelude.js';

function deliver(data: unknown, source: MessageEventSource | null = window.parent): void {
  window.dispatchEvent(new MessageEvent('message', { data, source }));
}

describe('runtime-injected navigation', () => {
  it('requires explicit navigation and intent exposure without granting a dependency', () => {
    expect(installNappletRuntimePrelude({ domains: ['navigation'] }).navigation).toBeUndefined();
    expect(installNappletRuntimePrelude({ domains: ['intent'] }).navigation).toBeUndefined();
    const installed = installNappletRuntimePrelude({ domains: ['navigation', 'intent'] });
    expect(Object.keys(installed).sort()).toEqual(['intent', 'navigation']);
    expect(Object.keys(installed.navigation!).sort()).toEqual(['get', 'report']);
  });

  it('backs SDK calls with exact envelopes and accepts only parent replies', async () => {
    const post = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
    try {
      installNappletRuntimePrelude({ domains: ['navigation', 'intent'] });
      expect(post).not.toHaveBeenCalled();
      const report = { revision: 1, location: { convention: 'napplet:profile/open', payload: { pubkey: 'a'.repeat(64) } } };
      const result = { ok: true, view: { entries: [{ id: 'visit-1', location: report.location }], index: 0, reportRevision: 1, status: 'current' } };
      const pending = navigation.report(report);
      const envelope = post.mock.calls[0][0];
      expect(envelope).toEqual({ type: 'navigation.report', id: expect.any(String), report });
      expect(post.mock.calls[0][1]).toBe('*');
      const settled = vi.fn();
      void pending.then(settled);
      deliver({ type: 'navigation.report.result', id: envelope.id, result }, {} as MessageEventSource);
      await Promise.resolve();
      expect(settled).not.toHaveBeenCalled();
      deliver({ type: 'navigation.report.result', id: envelope.id, result });
      await expect(pending).resolves.toEqual(result);
      const read = navigation.get();
      const request = post.mock.calls[1][0];
      deliver({ type: 'navigation.get.result', id: request.id, result });
      await expect(read).resolves.toEqual(result);
      installNappletRuntimePrelude({ domains: [] });
      expect(() => navigation.get()).toThrow('navigation');
    } finally {
      post.mockRestore();
    }
  });
});
