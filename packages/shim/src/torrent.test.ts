import { afterEach, describe, expect, it, vi } from 'vitest';
import { installNappletRuntimePrelude } from './prelude.js';
import { torrent } from '@napplet/sdk/torrent';
import { installFakeShell } from '../../nap/src/test-support/fake-shell.js';

/** A window-level message, even one whose source is the parent: NIP-5D shells speak NAP only over the port. */
function deliverAtWindowLevel(data: unknown): void {
  window.dispatchEvent(new MessageEvent('message', { data, source: window.parent }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('runtime-injected TORRENT', () => {
  it('exposes only granted domains and routes replies and job pushes only over the port', async () => {
    const shell = installFakeShell();
    const installed = installNappletRuntimePrelude({ domains: ['torrent'] });
    expect(Object.keys(installed)).toEqual(['torrent']);
    expect(shell.sent).toEqual([]);
    for (const retired of ['fromEvent', 'toMagnet', 'search', 'publish', 'comment']) {
      expect(installed.torrent).not.toHaveProperty(retired);
    }
    for (const method of ['metadata', 'read', 'exportMetainfo', 'saveFile', 'openFile', 'cancel', 'update']) {
      expect(installed.torrent).toHaveProperty(method, expect.any(Function));
    }
    const added = torrent.add({ source: { sourceType: 'infohash', hashes: { v1: 'a'.repeat(40) } } });
    const request = shell.sent[0] as { id: string; type: string };
    expect(request).toMatchObject({ type: 'torrent.add', request: { source: { sourceType: 'infohash' } } });
    const reply = { type: 'torrent.add.result', id: request.id, ack: { ok: true, jobId: 'job-1', state: 'metadata' } };
    let settled = false;
    void added.then(() => { settled = true; });
    deliverAtWindowLevel({ ...reply, ack: { ok: false, error: 'forged' } });
    await Promise.resolve();
    expect(settled).toBe(false);
    shell.deliver(reply);
    await expect(added).resolves.toEqual(reply.ack);

    const onState = vi.fn();
    const sub = torrent.onState(onState);
    const state = { type: 'torrent.state', jobId: 'job-1', state: 'paused' };
    deliverAtWindowLevel(state);
    await Promise.resolve();
    expect(onState).not.toHaveBeenCalled();
    shell.deliver(state);
    await Promise.resolve();
    expect(onState).toHaveBeenCalledTimes(1);
    sub.close();
    shell.deliver(state);
    await Promise.resolve();
    expect(onState).toHaveBeenCalledTimes(1);
    expect(shell.windowMessages).toEqual([]);

    installNappletRuntimePrelude({ domains: [] });
    expect(() => torrent.jobs()).toThrow('torrent');
  });
});
