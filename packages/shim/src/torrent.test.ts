import { describe, expect, it, vi } from 'vitest';
import { installNappletRuntimePrelude } from './prelude.js';
import { torrent } from '@napplet/sdk/torrent';

function deliver(data: unknown, source: MessageEventSource | null = window.parent): void {
  window.dispatchEvent(new MessageEvent('message', { data, source }));
}

describe('runtime-injected TORRENT', () => {
  it('exposes only granted domains and routes trusted replies and job pushes through SDK', async () => {
    const post = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
    try {
      const installed = installNappletRuntimePrelude({ domains: ['torrent'] });
      expect(Object.keys(installed)).toEqual(['torrent']);
      expect(post).not.toHaveBeenCalled();
      const added = torrent.add({ source: { sourceType: 'infohash', infoHash: 'a'.repeat(40) } });
      const request = post.mock.calls[0][0];
      expect(request).toMatchObject({ type: 'torrent.add', request: { source: { sourceType: 'infohash' } } });
      expect(post.mock.calls[0][1]).toBe('*');
      const reply = { type: 'torrent.add.result', id: request.id, ack: { ok: true, jobId: 'job-1', state: 'metadata' } };
      deliver({ ...reply, ack: { ok: false, error: 'forged' } }, {} as MessageEventSource);
      deliver(reply);
      await expect(added).resolves.toEqual(reply.ack);
      const onState = vi.fn();
      const sub = torrent.onState(onState);
      const state = { type: 'torrent.state', jobId: 'job-1', state: 'paused' };
      deliver(state, {} as MessageEventSource);
      expect(onState).not.toHaveBeenCalled();
      deliver(state);
      expect(onState).toHaveBeenCalledTimes(1);
      sub.close();
      deliver(state);
      expect(onState).toHaveBeenCalledTimes(1);
      installNappletRuntimePrelude({ domains: [] });
      expect(() => torrent.jobs()).toThrow('torrent');
      deliver(state);
      expect(onState).toHaveBeenCalledTimes(1);
    } finally { post.mockRestore(); }
  });
});
