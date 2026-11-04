import type { NappletGlobal } from '@napplet/core';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  installNappletRuntimePrelude,
  renderNappletRuntimePreludeCall,
  renderNappletRuntimePreludeScript,
} from './prelude.js';

beforeEach(() => {
  delete (window as Window & { napplet?: unknown }).napplet;
});

describe('@napplet/shim/prelude', () => {
  it('requires an explicit domain allowlist', () => {
    const install = installNappletRuntimePrelude as (options?: unknown) => unknown;

    expect(() => install()).toThrow('explicit domains array');
  });

  it('installs only requested callable domain objects', () => {
    const installed = installNappletRuntimePrelude({ domains: ['identity', 'storage'] });

    expect(installed.identity?.getPublicKey).toEqual(expect.any(Function));
    expect(installed.storage?.getItem).toEqual(expect.any(Function));
    expect(installed.relay).toBeUndefined();
    expect(installed.inc).toBeUndefined();
    expect((window as Window & { napplet?: typeof installed }).napplet).toBe(installed);
  });

  it('filters unknown domains out of rendered activation calls', () => {
    const call = renderNappletRuntimePreludeCall({
      domains: ['identity', 'not-real' as never, 'storage'],
    });

    expect(call).toBe(
      'globalThis.NappletShimPrelude.install({"domains":["identity","storage"]});',
    );
  });

  it('renders a script tag for the IIFE activation call', () => {
    expect(renderNappletRuntimePreludeScript({ domains: ['identity'] })).toBe(
      '<script>globalThis.NappletShimPrelude.install({"domains":["identity"]});</script>',
    );
  });
});

describe('maturity-controlled prelude', () => {
  it('defaults an opted-in policy to supported domains', () => {
    const installed = installNappletRuntimePrelude({ domains: ['storage', 'llm', 'ble'], maturity: {} });
    expect(Object.keys(installed)).toEqual(['storage']);
  });

  it('preserves legacy explicit allowlists without maturity policy', () => {
    const installed = installNappletRuntimePrelude({ domains: ['llm'] });
    expect(installed.llm?.select).toEqual(expect.any(Function));
  });

  it('resolves maturity on the host before rendering, without injecting policy metadata', () => {
    expect(renderNappletRuntimePreludeCall({
      domains: ['storage', 'ble', 'llm'], maturity: { optIn: ['llm', 'relay'] },
    })).toBe('globalThis.NappletShimPrelude.install({"domains":["storage","llm"]});');
  });

  it('replaces an earlier legacy install-all namespace with the selected set', async () => {
    await import('./index.js');
    expect((window as Window & { napplet?: NappletGlobal }).napplet?.llm).toBeDefined();
    const installed = installNappletRuntimePrelude({ domains: ['storage', 'llm'], maturity: {} });
    expect(Object.keys(installed)).toEqual(['storage']);
    expect((window as Window & { napplet?: NappletGlobal }).napplet?.llm).toBeUndefined();
    expect((window as Window & { napplet?: NappletGlobal }).napplet).toBe(installed);
  });
});
