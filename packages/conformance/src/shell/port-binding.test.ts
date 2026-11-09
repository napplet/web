import { describe, it, expect } from 'vitest';
import { bindNappletPort, type MessageWindowLike, type TransportViolation } from './port-binding.js';

// NIP-5D Transport + Identity (nostr-protocol/nips#2303): bind on the first valid hello, revoke on replacement evidence.
function setup(isInternal?: (data: unknown) => boolean) {
  let listener: ((event: MessageEvent) => void) | undefined;
  const host: MessageWindowLike = {
    addEventListener: (_type, l) => {
      listener = l;
    },
    removeEventListener: () => {
      listener = undefined;
    },
  };
  const frame = {};
  const revoked: TransportViolation[] = [];
  const handled: unknown[] = [];
  const binding = bindNappletPort({
    host,
    source: frame,
    onMessage: (envelope) => {
      handled.push(envelope);
      return [];
    },
    onRevoke: (violation) => revoked.push(violation),
    isInternal,
  });
  const send = (data: unknown, ports: MessagePort[] = [], source: unknown = frame) =>
    listener?.({ source, data, ports } as unknown as MessageEvent);
  const hello = () => {
    const channel = new MessageChannel();
    send({ type: 'napplet.hello' }, [channel.port2]);
    return channel;
  };
  return { binding, send, hello, revoked, handled, listening: () => listener !== undefined };
}

describe('bindNappletPort', () => {
  it('binds the port from the first valid hello and processes NAP messages from it', async () => {
    const t = setup();
    const channel = t.hello();
    expect(t.binding.bound).toBe(true);
    channel.port1.postMessage({ type: 'storage.keys', id: '1' });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(t.handled).toEqual([{ type: 'storage.keys', id: '1' }]);
    t.binding.detach();
    channel.port1.close();
  });

  it('drops messages from sources it did not create', () => {
    const t = setup();
    const channel = new MessageChannel();
    t.send({ type: 'napplet.hello' }, [channel.port2], {});
    expect(t.binding.bound).toBe(false);
    expect(t.revoked).toEqual([]);
    channel.port1.close();
  });

  it('revokes on a second hello', () => {
    const t = setup();
    const first = t.hello();
    const second = t.hello();
    expect(t.revoked.map((v) => v.kind)).toEqual(['second-hello']);
    expect(t.binding.bound).toBe(false);
    expect(t.listening()).toBe(false);
    first.port1.close();
    second.port1.close();
  });

  it('revokes on a window-level NAP message before or after the handoff', () => {
    const before = setup();
    before.send({ type: 'storage.get', id: '1', key: 'k' });
    expect(before.revoked.map((v) => v.kind)).toEqual(['window-message']);
    expect(before.handled).toEqual([]);

    const after = setup();
    const channel = after.hello();
    after.send({ type: 'storage.get', id: '1', key: 'k' });
    expect(after.revoked.map((v) => v.kind)).toEqual(['window-message']);
    expect(after.handled).toEqual([]);
    channel.port1.close();
  });

  it('rejects a hello without exactly one port', () => {
    const t = setup();
    t.send({ type: 'napplet.hello' });
    expect(t.revoked.map((v) => v.kind)).toEqual(['invalid-hello']);
  });

  it('lets the host report a second load and ignores the harness probes it names', () => {
    const t = setup((data) => (data as { type?: string }).type === 'probe');
    const channel = t.hello();
    t.send({ type: 'probe' });
    expect(t.binding.bound).toBe(true);
    t.binding.revoke({ kind: 'second-load', detail: 'navigated' });
    expect(t.revoked.map((v) => v.kind)).toEqual(['second-load']);
    expect(t.binding.bound).toBe(false);
    channel.port1.close();
  });
});
