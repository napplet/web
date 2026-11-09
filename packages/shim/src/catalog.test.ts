import { afterEach, describe, expect, it, vi } from 'vitest';
import { catalog, catalogGet } from '@napplet/sdk';
import { get } from '@napplet/sdk/catalog';
import { installNappletRuntimePrelude, renderNappletRuntimePreludeCall } from './prelude.js';
import { installFakeShell } from '../../nap/src/test-support/fake-shell.js';

/** A window-level message, even one whose source is the parent: NIP-5D shells speak NAP only over the port. */
function deliverAtWindowLevel(data: unknown): void {
  window.dispatchEvent(new MessageEvent('message', { data, source: window.parent }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('runtime-injected CATALOG', () => {
  it('serves SDK calls without shell or intent and accepts results only over the port', async () => {
    const snapshot = { napplets: [], handlers: [] };
    const shell = installFakeShell();
    const installed = installNappletRuntimePrelude({ domains: ['catalog'] });
    expect(Object.keys(installed)).toEqual(['catalog']);
    expect(shell.sent).toEqual([]);
    expect(renderNappletRuntimePreludeCall({ domains: ['catalog'] })).toContain('"domains":["catalog"]');

    const request = catalog.get();
    expect(shell.sent).toHaveLength(1);
    const message = shell.sent[0] as { type: string; id: string };
    expect(message).toEqual({ type: 'catalog.get', id: expect.any(String) });
    let settled = false;
    void request.then(() => { settled = true; });
    deliverAtWindowLevel({ type: 'catalog.get.result', id: message.id, snapshot });
    await Promise.resolve();
    expect(settled).toBe(false);
    shell.deliver({ type: 'catalog.get.result', id: message.id, snapshot });
    await expect(request).resolves.toEqual(snapshot);

    shell.onSend((sent) => shell.deliver({ type: 'catalog.get.result', id: sent.id, snapshot }));
    await expect(get()).resolves.toEqual(snapshot);
    await expect(catalogGet()).resolves.toEqual(snapshot);
    expect(shell.windowMessages).toEqual([]);

    installNappletRuntimePrelude({ domains: [] });
    expect(() => catalog.get()).toThrow('catalog');
    expect(() => get()).toThrow('catalog');
  });
});
