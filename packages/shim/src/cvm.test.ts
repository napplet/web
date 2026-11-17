import { afterEach, describe, expect, it, vi } from 'vitest';
import { cvm, cvmRegistryCall, cvmRegistryDescribe, cvmRegistryHas, cvmRegistryList } from '@napplet/sdk';
import type { CvmRegistryEntry, CvmRegistrySelector } from '@napplet/core';
import { installNappletRuntimePrelude } from './prelude.js';
import { installFakeShell } from '../../nap/src/test-support/fake-shell.js';

// CEP-15 SHA-256 of JCS({ inputSchema: { type: 'object' }, name: 'search_profiles' }).
const schemaHash = '088b807239ac8fc469b9228025cb93269cfc3e40c7522141014ac66e348a138f';
const entry: CvmRegistryEntry = {
  schemaHashes: [schemaHash],
  tools: [{ name: 'search_profiles', inputSchema: { type: 'object' }, schemaHash }],
};
const server = { pubkey: '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798' };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('runtime-injected CVM registry', () => {
  it.each<CvmRegistrySelector>([
    { family: 'relatr' },
    { schemaHash },
    { family: 'a-different-local-label', schemaHash },
  ])('forwards selector %j through all SDK and projection paths', async (selector) => {
    const shell = installFakeShell();
    const installed = installNappletRuntimePrelude({ domains: ['cvm'] });
    const registry = installed.cvm!.registry;
    const result = { content: [{ type: 'text', text: '{}' }] };
    shell.onSend((sent) => {
      const payload = sent.type === 'cvm.registry.has' ? { has: true }
        : sent.type === 'cvm.registry.describe' ? { entry }
        : { result };
      shell.deliver({ type: `${sent.type}.result`, id: sent.id, ...payload });
    });

    for (const has of [registry.has, cvm.registry.has, cvmRegistryHas]) {
      await expect(has(selector, { server })).resolves.toBe(true);
      expect(shell.sent.at(-1)).toEqual({
        type: 'cvm.registry.has', id: expect.any(String), selector, options: { server },
      });
    }
    for (const describe of [registry.describe, cvm.registry.describe, cvmRegistryDescribe]) {
      await expect(describe(selector, { server })).resolves.toEqual(entry);
      expect(shell.sent.at(-1)).toEqual({
        type: 'cvm.registry.describe', id: expect.any(String), selector, options: { server },
      });
    }
    const options = { server, timeoutMs: 120000, initialize: true, payment: 'deny' as const, cache: 'no-store' as const };
    for (const call of [registry.call, cvm.registry.call, cvmRegistryCall]) {
      await expect(call(selector, 'search_profiles', { q: 'jack' }, options)).resolves.toEqual(result);
      expect(shell.sent.at(-1)).toEqual({
        type: 'cvm.registry.call', id: expect.any(String), selector, tool: 'search_profiles', args: { q: 'jack' }, options,
      });
    }
    expect(shell.windowMessages).toEqual([]);
  });

  it('preserves category queries and entries without family labels', async () => {
    const shell = installFakeShell();
    const installed = installNappletRuntimePrelude({ domains: ['cvm'] });
    const query = { schemaHash, category: 'profiles', search: 'search', limit: 1 };
    shell.onSend((sent) => shell.deliver({ type: 'cvm.registry.list.result', id: sent.id, entries: [entry] }));
    for (const list of [installed.cvm!.registry.list, cvm.registry.list, cvmRegistryList]) {
      await expect(list(query)).resolves.toEqual([entry]);
      expect(shell.sent.at(-1)).toEqual({ type: 'cvm.registry.list', id: expect.any(String), query });
    }
  });

  it('preserves unavailable registry results', async () => {
    const shell = installFakeShell();
    installNappletRuntimePrelude({ domains: ['cvm'] });
    shell.onSend((sent) => shell.deliver({ type: `${sent.type}.result`, id: sent.id, has: false }));
    await expect(cvm.registry.has({ schemaHash })).resolves.toBe(false);
  });

  it.each(['schema mismatch', 'provider unavailable', 'policy denied'])('preserves shell failure: %s', async (error) => {
    const shell = installFakeShell();
    installNappletRuntimePrelude({ domains: ['cvm'] });
    shell.onSend((sent) => shell.deliver({ type: `${sent.type}.result`, id: sent.id, error }));
    await expect(cvm.registry.describe({ schemaHash })).rejects.toThrow(error);
    await expect(cvm.registry.call({ schemaHash }, 'search_profiles')).rejects.toThrow(error);
  });
});
