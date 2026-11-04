import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeShell, type FakeShell } from '../test-support/fake-shell.js';

const view = { entries: [], index: null, reportRevision: null, status: 'unreported' };
const result = { ok: true, view };
let shell: FakeShell;

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  shell = installFakeShell();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('navigation report/get transport', () => {
  it('preserves caller reports and structured rejections', async () => {
    const shim = await import('./shim.js');
    const report = { revision: 2, location: { convention: 'napplet:profile/open', payload: { pubkey: 'b'.repeat(64) }, title: 'Bob' } };
    const pending = shim.report(report);
    const envelope = shell.sent[0] as { id: string };
    expect(envelope).toEqual({ type: 'navigation.report', id: expect.any(String), report });
    const rejected = { ok: false, view, error: { code: 'unsupported', message: 'Unadvertised location' } };
    shim.handleNavigationMessage({ type: 'navigation.report.result', id: envelope.id, result: rejected });
    await expect(pending).resolves.toEqual(rejected);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('correlates both id and operation, ignoring unmatched and duplicate replies', async () => {
    const shim = await import('./shim.js');
    const pending = shim.get();
    const envelope = shell.sent[0] as { id: string };
    expect(envelope).toEqual({ type: 'navigation.get', id: expect.any(String) });
    const settled = vi.fn();
    void pending.then(settled);
    shim.handleNavigationMessage({ type: 'navigation.get.result', id: 'foreign', result });
    shim.handleNavigationMessage({ type: 'navigation.report.result', id: envelope.id, result });
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    shim.handleNavigationMessage({ type: 'navigation.get.result', id: envelope.id, result });
    await expect(pending).resolves.toEqual(result);
    shim.handleNavigationMessage({ type: 'navigation.get.result', id: envelope.id, result });
    expect(settled).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects malformed correlated results', async () => {
    const shim = await import('./shim.js');
    const pending = shim.get();
    shim.handleNavigationMessage({ type: 'navigation.get.result', id: shell.sent[0].id, result: { ok: true } });
    await expect(pending).rejects.toThrow('invalid navigation.get.result');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('expires unanswered requests and ignores their late results', async () => {
    const shim = await import('./shim.js');
    const pending = shim.get();
    const assertion = expect(pending).rejects.toThrow('navigation.get timed out');
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;
    shim.handleNavigationMessage({ type: 'navigation.get.result', id: shell.sent[0].id, result });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cleans up pending requests on teardown and transport failure', async () => {
    const shim = await import('./shim.js');
    const cleanup = shim.installNavigationShim();
    const pending = shim.get();
    cleanup();
    await expect(pending).rejects.toThrow('navigation shim uninstalled');
    expect(vi.getTimerCount()).toBe(0);
    // A fresh realm whose NIP-5D port refuses to send.
    installFakeShell();
    vi.stubGlobal('MessageChannel', class {
      port1 = { onmessage: null, start() {}, close() {}, postMessage() { throw new Error('transport closed'); } };
      port2 = {};
    });
    await expect(shim.get()).rejects.toThrow('transport closed');
    expect(vi.getTimerCount()).toBe(0);
  });
});
