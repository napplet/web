import { describe, expect, it } from 'vitest';
import { bindPlayerFrame, type FrameLike, type HostLike, type Replacement } from './binding';

// NIP-5D Transport + Identity (nostr-protocol/nips#2303): bind the hello port, drop the frame when its document is replaced.
function setup() {
  let onMessage: ((event: MessageEvent) => void) | undefined;
  let onLoad: (() => void) | undefined;
  const contentWindow = {};
  const frame: FrameLike = {
    contentWindow,
    addEventListener: (_type, listener) => { onLoad = listener; },
    removeEventListener: () => { onLoad = undefined; },
  };
  const host: HostLike = {
    addEventListener: (_type, listener) => { onMessage = listener; },
    removeEventListener: () => { onMessage = undefined; },
  };
  const reasons: Replacement[] = [];
  const binding = bindPlayerFrame(frame, host, reason => reasons.push(reason));
  const post = (data: unknown, ports: MessagePort[] = [], source: unknown = contentWindow) =>
    onMessage?.({ source, data, ports } as unknown as MessageEvent);
  const channels: MessageChannel[] = [];
  const hello = () => {
    const channel = new MessageChannel();
    channels.push(channel);
    post({ type: 'napplet.hello' }, [channel.port2]);
  };
  const load = () => onLoad?.();
  const cleanup = () => { binding.release(); for (const channel of channels) channel.port1.close(); };
  return { binding, post, hello, load, reasons, cleanup };
}

describe('bindPlayerFrame', () => {
  it('binds the verified document and resolves on its first load', async () => {
    const t = setup();
    t.hello();
    t.load();
    await t.binding.loaded;
    expect(t.binding.bound).toBe(true);
    expect(t.reasons).toEqual([]);
    t.cleanup();
  });

  it('drops the frame when the napplet navigates or reloads (second load)', () => {
    const t = setup();
    t.hello();
    t.load();
    t.load();
    expect(t.reasons).toEqual(['second-load']);
    expect(t.binding.bound).toBe(false);
    t.cleanup();
  });

  it('drops the frame on a second hello, a window-level message or a bad hello', () => {
    const second = setup();
    second.hello();
    second.hello();
    expect(second.reasons).toEqual(['second-hello']);
    second.cleanup();

    const windowLevel = setup();
    windowLevel.hello();
    windowLevel.post({ type: 'storage.get', id: '1', key: 'k' });
    expect(windowLevel.reasons).toEqual(['window-message']);
    windowLevel.cleanup();

    const bad = setup();
    bad.post({ type: 'napplet.hello' });
    expect(bad.reasons).toEqual(['invalid-hello']);
  });

  it('ignores other windows and reports only once', () => {
    const t = setup();
    t.post({ type: 'napplet.hello' }, [], {});
    expect(t.reasons).toEqual([]);
    t.hello();
    t.load();
    t.load();
    t.load();
    expect(t.reasons).toEqual(['second-load']);
    t.cleanup();
  });

  it('stays quiet after release', () => {
    const t = setup();
    t.hello();
    t.binding.release();
    t.load();
    t.load();
    expect(t.reasons).toEqual([]);
    t.cleanup();
  });
});
