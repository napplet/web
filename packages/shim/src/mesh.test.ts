import { describe, expect, it, vi } from 'vitest';
import { mesh } from '@napplet/sdk/mesh';
import { installNappletRuntimePrelude } from './prelude.js';

function deliver(data: unknown, source: MessageEventSource | null = window.parent): void {
  window.dispatchEvent(new MessageEvent('message', { data, source }));
}

describe('runtime-injected MESH', () => {
  it('exposes only requested mesh and routes SDK calls and ongoing deliveries through the parent', async () => {
    const post = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
    try {
      const installed = installNappletRuntimePrelude({ domains: ['mesh'] });
      expect(Object.keys(installed)).toEqual(['mesh']);
      const info = mesh.info();
      const request = post.mock.calls.at(-1)![0];
      const status = { online: false, peers: 0, limits: { publishTtl: 3, subscribeTtl: 2 } };
      deliver({ type: 'mesh.info.result', id: request.id, ...status });
      await expect(info).resolves.toEqual(status);

      const sub = mesh.subscribe({ kinds: [9] }, { ttl: 0 });
      const subscribe = post.mock.calls.at(-1)![0];
      expect(subscribe).toMatchObject({ type: 'mesh.subscribe', filters: [{ kinds: [9] }], ttl: 0 });
      const event = vi.fn();
      const eose = vi.fn();
      const closed = vi.fn();
      sub.on('event', event);
      sub.on('eose', eose);
      sub.on('closed', closed);
      deliver({ type: 'mesh.eose', subId: subscribe.subId, ttl: 0 }, {} as MessageEventSource);
      expect(eose).not.toHaveBeenCalled();
      deliver({ type: 'mesh.eose', subId: subscribe.subId, ttl: 0 });
      expect(eose).toHaveBeenCalledExactlyOnceWith(0);
      const result = { event: { id: 'a'.repeat(64), pubkey: 'b'.repeat(64), created_at: 1, kind: 9, tags: [], content: 'hello', sig: 'c'.repeat(128) } };
      deliver({ type: 'mesh.event', subId: subscribe.subId, result });
      expect(event).toHaveBeenCalledExactlyOnceWith(result);
      deliver({ type: 'mesh.closed', subId: subscribe.subId, reason: 'revoked' });
      expect(closed).toHaveBeenCalledExactlyOnceWith('revoked');
      sub.close();
      installNappletRuntimePrelude({ domains: [] });
      expect(() => mesh.info()).toThrow('mesh');
      deliver({ type: 'mesh.event', subId: subscribe.subId, result });
      expect(event).toHaveBeenCalledTimes(1);
    } finally { post.mockRestore(); }
  });
});
