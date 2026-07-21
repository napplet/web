import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface PostedMessage {
  msg: any;
  targetOrigin: string;
}

let postedMessages: PostedMessage[];
let uuidCounter: number;
let originalCryptoDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  postedMessages = [];
  uuidCounter = 0;
  originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      randomUUID: () => `cvm-test-${++uuidCounter}`,
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
  vi.restoreAllMocks();
  if (originalCryptoDescriptor) {
    Object.defineProperty(globalThis, 'crypto', originalCryptoDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'crypto');
  }
  Reflect.deleteProperty(globalThis, 'window');
});

/** Find the most recent posted message of a given type. */
function lastPosted(type: string): any {
  for (let i = postedMessages.length - 1; i >= 0; i--) {
    if (postedMessages[i].msg?.type === type) return postedMessages[i].msg;
  }
  throw new Error(`no posted message of type ${type}`);
}

describe('@napplet/nap/cvm shim', () => {
  it('posts cvm.discover and resolves with the shell-returned servers', async () => {
    const { discover, handleCvmMessage } = await import('./shim.js');

    const promise = discover({ search: 'relay', limit: 5 });
    const sent = lastPosted('cvm.discover');
    expect(sent.query).toEqual({ search: 'relay', limit: 5 });

    handleCvmMessage({
      type: 'cvm.discover.result',
      id: sent.id,
      servers: [{ pubkey: '65a334', name: 'RelayVM' }],
    });

    await expect(promise).resolves.toEqual([{ pubkey: '65a334', name: 'RelayVM' }]);
  });

  it('correlates cvm.request with cvm.request.result and resolves the MCP message', async () => {
    const { request, handleCvmMessage } = await import('./shim.js');

    const server = { pubkey: '65a334', relays: ['wss://relay.example.com'] };
    const promise = request(server, { jsonrpc: '2.0', id: 1, method: 'ping' });
    const sent = lastPosted('cvm.request');
    expect(sent.server).toEqual(server);
    expect(sent.message).toEqual({ jsonrpc: '2.0', id: 1, method: 'ping' });

    const reply = { jsonrpc: '2.0' as const, id: 1, result: { ok: true } };
    handleCvmMessage({ type: 'cvm.request.result', id: sent.id, message: reply });

    await expect(promise).resolves.toEqual(reply);
  });

  it('callTool builds a tools/call JSON-RPC envelope and returns the MCP tool result', async () => {
    const { callTool, handleCvmMessage } = await import('./shim.js');

    const promise = callTool({ pubkey: '65a334' }, 'get_relay', { url: 'wss://r.example' });
    const sent = lastPosted('cvm.request');
    expect(sent.message.method).toBe('tools/call');
    expect(sent.message.params).toEqual({ name: 'get_relay', arguments: { url: 'wss://r.example' } });

    handleCvmMessage({
      type: 'cvm.request.result',
      id: sent.id,
      message: { jsonrpc: '2.0', id: sent.message.id, result: { content: [{ type: 'text', text: '{}' }], isError: false } },
    });

    await expect(promise).resolves.toEqual({ content: [{ type: 'text', text: '{}' }], isError: false });
  });

  it('surfaces MCP-level errors from the embedded message as a rejection', async () => {
    const { callTool, handleCvmMessage } = await import('./shim.js');

    const promise = callTool({ pubkey: '65a334' }, 'boom');
    const sent = lastPosted('cvm.request');
    handleCvmMessage({
      type: 'cvm.request.result',
      id: sent.id,
      message: { jsonrpc: '2.0', id: sent.message.id, error: { code: -32000, message: 'kaboom' } },
    });

    await expect(promise).rejects.toThrow(/tools\/call: kaboom/);
  });

  it('surfaces transport/policy errors from the envelope error field as a rejection', async () => {
    const { request, handleCvmMessage } = await import('./shim.js');

    const promise = request({ pubkey: '65a334' }, { jsonrpc: '2.0', id: 1, method: 'ping' });
    const sent = lastPosted('cvm.request');
    handleCvmMessage({ type: 'cvm.request.result', id: sent.id, error: 'policy denied' });

    await expect(promise).rejects.toThrow('policy denied');
  });

  it('readResource returns the first content entry from resources/read', async () => {
    const { readResource, handleCvmMessage } = await import('./shim.js');

    const promise = readResource({ pubkey: '65a334' }, 'nostr:abc');
    const sent = lastPosted('cvm.request');
    expect(sent.message.method).toBe('resources/read');
    expect(sent.message.params).toEqual({ uri: 'nostr:abc' });

    handleCvmMessage({
      type: 'cvm.request.result',
      id: sent.id,
      message: {
        jsonrpc: '2.0',
        id: sent.message.id,
        result: { contents: [{ uri: 'nostr:abc', text: 'hello' }, { uri: 'nostr:abc', text: 'second' }] },
      },
    });

    await expect(promise).resolves.toEqual({ uri: 'nostr:abc', text: 'hello' });
  });

  it('delivers cvm.event to registered listeners and stops after close()', async () => {
    const { onEvent, handleCvmMessage } = await import('./shim.js');

    const received: Array<{ server: unknown; message: unknown }> = [];
    const sub = onEvent((server, message) => received.push({ server, message }));

    const evt = {
      type: 'cvm.event',
      server: { pubkey: '65a334' },
      message: { jsonrpc: '2.0', method: 'notifications/progress', params: { progress: 50 } },
    };
    handleCvmMessage(evt);
    expect(received).toHaveLength(1);
    expect(received[0].server).toEqual({ pubkey: '65a334' });

    sub.close();
    handleCvmMessage(evt);
    expect(received).toHaveLength(1);
  });

  it('close posts cvm.close and resolves on cvm.close.result', async () => {
    const { close, handleCvmMessage } = await import('./shim.js');

    const promise = close({ pubkey: '65a334' });
    const sent = lastPosted('cvm.close');
    expect(sent.server).toEqual({ pubkey: '65a334' });

    handleCvmMessage({ type: 'cvm.close.result', id: sent.id });
    await expect(promise).resolves.toBeUndefined();
  });

  it('registry.list posts cvm.registry.list and resolves returned entries', async () => {
    const { registryList, handleCvmMessage } = await import('./shim.js');

    const promise = registryList({ family: 'relatr', limit: 1 });
    const sent = lastPosted('cvm.registry.list');
    expect(sent.query).toEqual({ family: 'relatr', limit: 1 });

    const entries = [
      {
        family: 'relatr',
        tools: [{ name: 'search_profiles', inputSchema: { type: 'object' } }],
      },
    ];
    handleCvmMessage({ type: 'cvm.registry.list.result', id: sent.id, entries });

    await expect(promise).resolves.toEqual(entries);
  });

  it('registry.has posts cvm.registry.has and resolves availability', async () => {
    const { registryHas, handleCvmMessage } = await import('./shim.js');

    const promise = registryHas('relatr', { schemaHash: 'abc123' });
    const sent = lastPosted('cvm.registry.has');
    expect(sent.family).toBe('relatr');
    expect(sent.options).toEqual({ schemaHash: 'abc123' });

    handleCvmMessage({ type: 'cvm.registry.has.result', id: sent.id, has: true });
    await expect(promise).resolves.toBe(true);
  });

  it('registry.describe rejects when the shell omits entry without an error', async () => {
    const { registryDescribe, handleCvmMessage } = await import('./shim.js');

    const promise = registryDescribe('relatr');
    const sent = lastPosted('cvm.registry.describe');
    handleCvmMessage({ type: 'cvm.registry.describe.result', id: sent.id });

    await expect(promise).rejects.toThrow('cvm.registry.describe.result missing entry');
  });

  it('registry.call posts cvm.registry.call and resolves MCP tool results', async () => {
    const { registryCall, handleCvmMessage } = await import('./shim.js');

    const promise = registryCall('relatr', 'search_profiles', { q: 'jack' }, { cache: 'reload' });
    const sent = lastPosted('cvm.registry.call');
    expect(sent.family).toBe('relatr');
    expect(sent.tool).toBe('search_profiles');
    expect(sent.args).toEqual({ q: 'jack' });
    expect(sent.options).toEqual({ cache: 'reload' });

    const result = { content: [{ type: 'text', text: '{}' }], isError: false };
    handleCvmMessage({ type: 'cvm.registry.call.result', id: sent.id, result });

    await expect(promise).resolves.toEqual(result);
  });

  it('ignores unknown and uncorrelated messages without throwing', async () => {
    const { handleCvmMessage } = await import('./shim.js');

    expect(() => handleCvmMessage({ type: 'unknown.domain' })).not.toThrow();
    expect(() => handleCvmMessage({ type: 'cvm.request.result', id: 'no-such-id' })).not.toThrow();
    expect(() => handleCvmMessage({ type: 'cvm.event' })).not.toThrow();
  });
});
