import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('window', { napplet: { shell: {}, identity: {}, theme: {} }, parent: { postMessage: vi.fn() } });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('optional NAP-SHELL environment', () => {
  it('queries presence before readiness and installs one automatic signal', async () => {
    const { installShellShim, ready, supports, shell, handleShellMessage } = await import('./shim.js');
    expect(supports('theme')).toBe(true);
    expect(supports('resource')).toBe(false);
    expect(supports('toString')).toBe(false);
    expect(shell.services).toEqual([]);
    const cleanup = installShellShim();
    installShellShim();
    const first = ready();
    const second = ready();
    expect(window.parent.postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'shell.ready' }, '*');
    const environment = { capabilities: { domains: ['shell'] }, services: ['settings'] };
    handleShellMessage({ type: 'shell.init', ...environment });
    await expect(first).resolves.toEqual(environment);
    await expect(second).resolves.toEqual(environment);
    expect(shell.services).toEqual(['settings']);
    expect(supports('theme')).toBe(true);
    cleanup();
  });

  it('delivers one-shot callbacks before and after init, preserving the first snapshot', async () => {
    const { installShellShim, onReady, handleShellMessage } = await import('./shim.js');
    const cleanup = installShellShim();
    const early = vi.fn();
    const cancelled = vi.fn();
    onReady(early);
    onReady(cancelled).close();
    const environment = { capabilities: { domains: ['shell'] }, services: [] };
    handleShellMessage({ type: 'shell.init', ...environment });
    handleShellMessage({ type: 'shell.init', capabilities: { domains: ['relay'] }, services: ['other'] });
    const late = vi.fn();
    onReady(late);
    expect(early).toHaveBeenCalledExactlyOnceWith(environment);
    expect(late).toHaveBeenCalledExactlyOnceWith(environment);
    expect(cancelled).not.toHaveBeenCalled();
    cleanup();
  });
});
