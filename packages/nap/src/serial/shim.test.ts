import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeShell, type FakeShell } from '../test-support/fake-shell.js';

let shell: FakeShell;
let uuidCounter: number;
let originalCryptoDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  uuidCounter = 0;
  originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      randomUUID: () => `serial-test-${++uuidCounter}`,
    },
  });

  shell = installFakeShell();

  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalCryptoDescriptor) {
    Object.defineProperty(globalThis, 'crypto', originalCryptoDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'crypto');
  }
  vi.unstubAllGlobals();
});

describe('@napplet/nap/serial shim', () => {
  it('opens serial sessions with runtime-owned chooser options', async () => {
    const { handleSerialMessage, open } = await import('./shim.js');

    const result = open({
      filters: [{ usbVendorId: 9025 }],
      options: { baudRate: 115200, dataBits: 8, parity: 'none' },
      label: 'controller',
    });

    expect(shell.sent).toEqual([
      {
        type: 'serial.open',
        id: 'serial-test-1',
        request: {
          filters: [{ usbVendorId: 9025 }],
          options: { baudRate: 115200, dataBits: 8, parity: 'none' },
          label: 'controller',
        },
      },
    ]);

    handleSerialMessage({
      type: 'serial.open.result',
      id: 'serial-test-1',
      session: {
        id: 'serial-1',
        state: 'open',
        info: { usbVendorId: 9025, displayName: 'Arduino' },
      },
    });

    await expect(result).resolves.toEqual({
      session: {
        id: 'serial-1',
        state: 'open',
        info: { usbVendorId: 9025, displayName: 'Arduino' },
      },
    });
  });

  it('rejects open failures from the runtime', async () => {
    const { handleSerialMessage, open } = await import('./shim.js');

    const result = open({ options: { baudRate: 9600 } });

    handleSerialMessage({
      type: 'serial.open.result',
      id: 'serial-test-1',
      error: 'user cancelled',
    });

    await expect(result).rejects.toThrow('user cancelled');
  });

  it('writes Uint8Array input as JSON byte arrays', async () => {
    const { handleSerialMessage, write } = await import('./shim.js');

    const result = write('serial-1', new Uint8Array([112, 105, 110, 103, 10]));

    expect(shell.sent).toEqual([
      {
        type: 'serial.write',
        id: 'serial-test-1',
        sessionId: 'serial-1',
        data: [112, 105, 110, 103, 10],
      },
    ]);

    handleSerialMessage({ type: 'serial.write.result', id: 'serial-test-1' });

    await expect(result).resolves.toBeUndefined();
  });

  it('closes serial sessions with optional reasons', async () => {
    const { close, handleSerialMessage } = await import('./shim.js');

    const result = close('serial-1', 'done');

    expect(shell.sent).toEqual([
      {
        type: 'serial.close',
        id: 'serial-test-1',
        sessionId: 'serial-1',
        reason: 'done',
      },
    ]);

    handleSerialMessage({ type: 'serial.close.result', id: 'serial-test-1' });

    await expect(result).resolves.toBeUndefined();
  });

  it('fans out shell-pushed serial events until subscriptions close', async () => {
    const { handleSerialMessage, onEvent } = await import('./shim.js');
    const first = vi.fn();
    const second = vi.fn();

    const firstSub = onEvent(first);
    onEvent(second);

    handleSerialMessage({
      type: 'serial.event',
      event: { type: 'data', sessionId: 'serial-1', data: [79, 75, 10] },
    });
    firstSub.close();
    handleSerialMessage({
      type: 'serial.event',
      event: { type: 'closed', sessionId: 'serial-1', reason: 'device disconnected' },
    });

    expect(first).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledWith({ type: 'data', sessionId: 'serial-1', data: [79, 75, 10] });
    expect(second).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenNthCalledWith(1, { type: 'data', sessionId: 'serial-1', data: [79, 75, 10] });
    expect(second).toHaveBeenNthCalledWith(2, { type: 'closed', sessionId: 'serial-1', reason: 'device disconnected' });
  });
});
