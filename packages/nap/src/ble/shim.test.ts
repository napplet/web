import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const posted: Array<Record<string, unknown>> = [];
const target = { service: 'battery_service', characteristic: 'battery_level' };
let uuidCounter = 0;
let originalCryptoDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  posted.length = 0;
  uuidCounter = 0;
  originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      randomUUID: () => `id-${++uuidCounter}`,
    },
  });

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      parent: {
        postMessage(msg: Record<string, unknown>) {
          posted.push(msg);
        },
      },
    },
  });

  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalCryptoDescriptor) {
    Object.defineProperty(globalThis, 'crypto', originalCryptoDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'crypto');
  }
  Reflect.deleteProperty(globalThis, 'window');
});

describe('ble shim', () => {
  it('opens a BLE session', async () => {
    const { handleBleMessage, open } = await import('./shim.js');

    const promise = open({ filters: [{ services: ['heart_rate'] }], label: 'heart monitor' });
    expect(posted[0]).toEqual({
      type: 'ble.open',
      id: 'id-1',
      request: { filters: [{ services: ['heart_rate'] }], label: 'heart monitor' },
    });

    handleBleMessage({
      type: 'ble.open.result',
      id: 'id-1',
      session: { id: 'ble-1', state: 'open', device: { id: 'dev-1', name: 'HR Monitor' } },
    });

    await expect(promise).resolves.toEqual({
      session: { id: 'ble-1', state: 'open', device: { id: 'dev-1', name: 'HR Monitor' } },
    });
  });

  it('lists services and reads bytes', async () => {
    const { handleBleMessage, read, services } = await import('./shim.js');

    const servicesPromise = services('ble-1');
    handleBleMessage({
      type: 'ble.services.result',
      id: 'id-1',
      services: [{ uuid: 'battery_service', characteristics: [{ uuid: 'battery_level', properties: { read: true } }] }],
    });
    await expect(servicesPromise).resolves.toEqual([
      { uuid: 'battery_service', characteristics: [{ uuid: 'battery_level', properties: { read: true } }] },
    ]);

    const readPromise = read('ble-1', target);
    handleBleMessage({ type: 'ble.read.result', id: 'id-2', data: [97] });
    await expect(readPromise).resolves.toEqual([97]);
  });

  it('writes, subscribes, unsubscribes, and closes', async () => {
    const { close, handleBleMessage, subscribe, unsubscribe, write } = await import('./shim.js');

    const writePromise = write('ble-1', target, [1, 2, 3], { response: 'with-response' });
    handleBleMessage({ type: 'ble.write.result', id: 'id-1' });
    await expect(writePromise).resolves.toBeUndefined();

    const subscribePromise = subscribe('ble-1', target);
    handleBleMessage({ type: 'ble.subscribe.result', id: 'id-2' });
    await expect(subscribePromise).resolves.toBeUndefined();

    const unsubscribePromise = unsubscribe('ble-1', target);
    handleBleMessage({ type: 'ble.unsubscribe.result', id: 'id-3' });
    await expect(unsubscribePromise).resolves.toBeUndefined();

    const closePromise = close('ble-1', 'done');
    handleBleMessage({ type: 'ble.close.result', id: 'id-4' });
    await expect(closePromise).resolves.toBeUndefined();

    expect(posted.map((m) => m.type)).toEqual([
      'ble.write',
      'ble.subscribe',
      'ble.unsubscribe',
      'ble.close',
    ]);
  });

  it('rejects result errors', async () => {
    const { handleBleMessage, read } = await import('./shim.js');

    const promise = read('missing', target);
    handleBleMessage({ type: 'ble.read.result', id: 'id-1', error: 'session not found' });
    await expect(promise).rejects.toThrow('session not found');
  });

  it('routes ble.event pushes to subscribers', async () => {
    const { handleBleMessage, onEvent } = await import('./shim.js');

    const handler = vi.fn();
    const sub = onEvent(handler);
    handleBleMessage({
      type: 'ble.event',
      event: { type: 'notification', sessionId: 'ble-1', target, data: [6, 72] },
    });
    expect(handler).toHaveBeenCalledWith({
      type: 'notification',
      sessionId: 'ble-1',
      target,
      data: [6, 72],
    });

    sub.close();
    handleBleMessage({ type: 'ble.event', event: { type: 'closed', sessionId: 'ble-1' } });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
