import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let cleanup: (() => void) | undefined;
let postMessage: ReturnType<typeof vi.fn>;

beforeEach(() => {
  postMessage = vi.fn();
  vi.stubGlobal('window', { parent: { postMessage } });
  vi.stubGlobal('document', {
    querySelector: vi.fn(() => ({
      getAttribute: (name: string) => name === 'content'
        ? '{"type":"object","properties":{"theme":{"type":"string"}}}'
        : null,
    })),
  });
  vi.resetModules();
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.unstubAllGlobals();
});

describe('@napplet/nap/config shim', () => {
  it('does not auto-discover a schema from HTML metadata', async () => {
    const { installConfigShim } = await import('./shim.js');
    cleanup = installConfigShim();

    const api = (window as unknown as Window & { napplet: { config: { schema: unknown } } }).napplet.config;
    expect(api.schema).toBeNull();
  });

  it('keeps explicitly registered schemas available after shell acceptance', async () => {
    const { handleConfigMessage, installConfigShim } = await import('./shim.js');
    cleanup = installConfigShim();

    const api = (window as unknown as Window & {
      napplet: { config: { schema: unknown; registerSchema(schema: unknown): Promise<void> } };
    }).napplet.config;
    const schema = { type: 'object', properties: { theme: { type: 'string' } } };
    const registration = api.registerSchema(schema);
    const [request] = postMessage.mock.calls[0] as [{ id: string }];
    handleConfigMessage({ type: 'config.registerSchema.result', id: request.id, ok: true });

    await expect(registration).resolves.toBeUndefined();
    expect(api.schema).toEqual(schema);
  });
});
