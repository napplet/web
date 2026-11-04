import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { navigation } from '@napplet/sdk/navigation';
import { installNappletRuntimePrelude } from './prelude.js';
import { installFakeShell, type FakeShell } from '../../nap/src/test-support/fake-shell.js';

let shell: FakeShell;

/** A window-level message, even one whose source is the parent: NIP-5D shells speak NAP only over the port. */
function deliverAtWindowLevel(data: unknown, source: MessageEventSource | null = window.parent): void {
  window.dispatchEvent(new MessageEvent('message', { data, source }));
}

beforeEach(() => {
  shell = installFakeShell();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('runtime-injected navigation', () => {
  it('requires explicit navigation and intent exposure without granting a dependency', () => {
    expect(installNappletRuntimePrelude({ domains: ['navigation'] }).navigation).toBeUndefined();
    expect(installNappletRuntimePrelude({ domains: ['intent'] }).navigation).toBeUndefined();
    const installed = installNappletRuntimePrelude({ domains: ['navigation', 'intent'] });
    expect(Object.keys(installed).sort()).toEqual(['intent', 'navigation']);
    expect(Object.keys(installed.navigation!).sort()).toEqual(['get', 'report']);
  });

  it('backs SDK calls with exact envelopes and accepts only port replies', async () => {
    installNappletRuntimePrelude({ domains: ['navigation', 'intent'] });
    expect(shell.sent).toEqual([]);
    const report = { revision: 1, location: { convention: 'napplet:profile/open', payload: { pubkey: 'a'.repeat(64) } } };
    const result = { ok: true, view: { entries: [{ id: 'visit-1', location: report.location }], index: 0, reportRevision: 1, status: 'current' } };
    const pending = navigation.report(report);
    const envelope = shell.sent[0];
    expect(envelope).toEqual({ type: 'navigation.report', id: expect.any(String), report });
    const settled = vi.fn();
    void pending.then(settled);
    deliverAtWindowLevel({ type: 'navigation.report.result', id: envelope.id, result }, {} as MessageEventSource);
    deliverAtWindowLevel({ type: 'navigation.report.result', id: envelope.id, result });
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    shell.deliver({ type: 'navigation.report.result', id: envelope.id, result });
    await expect(pending).resolves.toEqual(result);
    const read = navigation.get();
    const request = shell.sent[1];
    shell.deliver({ type: 'navigation.get.result', id: request.id, result });
    await expect(read).resolves.toEqual(result);
    installNappletRuntimePrelude({ domains: [] });
    expect(() => navigation.get()).toThrow('navigation');
  });
});
