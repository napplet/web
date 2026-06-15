import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Theme } from './types.js';

interface PostedMessage {
  msg: unknown;
  targetOrigin: string;
}

let postedMessages: PostedMessage[];
let uuidCounter: number;
let originalCryptoDescriptor: PropertyDescriptor | undefined;

const SAMPLE_THEME: Theme = {
  colors: { background: '#120820', text: '#f1ecfb', primary: '#b06bff' },
  title: 'Aubergine',
};

beforeEach(() => {
  postedMessages = [];
  uuidCounter = 0;
  originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      randomUUID: () => `theme-test-${++uuidCounter}`,
    },
  });

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      parent: {
        postMessage(msg: unknown, targetOrigin: string) {
          postedMessages.push({ msg, targetOrigin });
        },
      },
    },
  });

  vi.resetModules();
});

afterEach(() => {
  if (originalCryptoDescriptor) {
    Object.defineProperty(globalThis, 'crypto', originalCryptoDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'crypto');
  }
  Reflect.deleteProperty(globalThis, 'window');
});

describe('@napplet/nap/theme shim', () => {
  it('get posts theme.get and resolves with the theme.get.result payload', async () => {
    const { get, handleThemeMessage } = await import('./shim.js');

    const result = get();

    expect(postedMessages).toEqual([
      { msg: { type: 'theme.get', id: 'theme-test-1' }, targetOrigin: '*' },
    ]);

    handleThemeMessage({
      type: 'theme.get.result',
      id: 'theme-test-1',
      theme: SAMPLE_THEME,
    });

    await expect(result).resolves.toEqual(SAMPLE_THEME);
  });

  it('get rejects when the shell returns an error', async () => {
    const { get, handleThemeMessage } = await import('./shim.js');

    const result = get();

    handleThemeMessage({
      type: 'theme.get.result',
      id: 'theme-test-1',
      error: 'theme:unavailable',
    });

    await expect(result).rejects.toThrow('theme:unavailable');
  });

  it('onChanged fans out theme.changed updates until closed', async () => {
    const { handleThemeMessage, onChanged } = await import('./shim.js');
    const seen: Theme[] = [];

    const sub = onChanged((theme) => {
      seen.push(theme);
    });

    handleThemeMessage({ type: 'theme.changed', theme: SAMPLE_THEME });
    sub.close();
    handleThemeMessage({ type: 'theme.changed', theme: SAMPLE_THEME });

    expect(seen).toEqual([SAMPLE_THEME]);
  });

  it('install cleanup clears change handlers', async () => {
    const { handleThemeMessage, installThemeShim, onChanged } = await import('./shim.js');
    const cleanup = installThemeShim();
    const seen: Theme[] = [];

    onChanged((theme) => {
      seen.push(theme);
    });

    cleanup();
    handleThemeMessage({ type: 'theme.changed', theme: SAMPLE_THEME });

    expect(seen).toEqual([]);
  });

  it('ignores non-theme messages', async () => {
    const { handleThemeMessage, onChanged } = await import('./shim.js');
    const seen: Theme[] = [];

    onChanged((theme) => {
      seen.push(theme);
    });

    handleThemeMessage({ type: 'identity.changed', pubkey: 'ab12' });

    expect(seen).toEqual([]);
  });
});
