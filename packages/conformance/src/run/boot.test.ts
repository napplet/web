// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { bootAndCollect, harnessContentSecurityPolicy, runtimePrelude } from './boot.js';

// happy-dom does not execute srcdoc scripts, so these DOM-wiring tests never run
// the prelude. `bindings.test.ts` executes the maintained shim source for real.
const runtimePreludeSource = '/* maintained shim prelude */';

describe('bootAndCollect — DOM wiring', () => {
  it('does not infer installation from an uninstrumented DOM load and cleans up the iframe', async () => {
    const before = document.querySelectorAll('iframe').length;
    const boot = await bootAndCollect({
      url: 'about:blank',
      runtimePreludeSource,
      readyTimeoutMs: 60,
      settleMs: 0,
      runDegraded: false,
    });
    // happy-dom does not execute srcdoc scripts. A successful load alone is not
    // evidence that the namespace was installed; real Chromium covers that path.
    expect(boot.installedGlobal).toBe(false);
    expect(boot.bootError).toBeNull();
    expect(boot.emitted).toEqual([]);
    expect(boot.degraded).toBeNull();
    expect(document.querySelectorAll('iframe').length).toBe(before);
  });

  it('keeps installation separate from subject errors and ignores peer telemetry', async () => {
    const pending = bootAndCollect({ url: 'about:blank', runtimePreludeSource, readyTimeoutMs: 60, settleMs: 10, runDegraded: false });
    await Promise.resolve();
    const frame = document.querySelector('iframe')!;
    expect(frame).not.toBeNull();
    window.dispatchEvent(new MessageEvent('message', { source: frame.contentWindow, data: { type: '__nappletConformance.installed', installed: true } }));
    window.dispatchEvent(new MessageEvent('message', { source: window, data: { type: '__nappletConformance.installed', installed: false } }));
    window.dispatchEvent(new MessageEvent('message', { source: frame.contentWindow, data: { type: '__nappletConformance.error', reason: 'subject failure' } }));
    const boot = await pending;
    expect(boot.installedGlobal).toBe(true);
    expect(boot.bootError).toBe('napplet boot error: subject failure');
    expect(boot.emitted).toEqual([]);
  });

  it('treats a window-level NAP message as a replaced document and removes the frame', async () => {
    const before = document.querySelectorAll('iframe').length;
    const pending = bootAndCollect({ url: 'about:blank', runtimePreludeSource, readyTimeoutMs: 60, settleMs: 10, runDegraded: false });
    await Promise.resolve();
    const frame = document.querySelector('iframe')!;
    window.dispatchEvent(new MessageEvent('message', { source: frame.contentWindow, data: { type: 'storage.get', id: 's1', key: 'k' } }));
    expect(document.querySelectorAll('iframe').length).toBe(before);
    const boot = await pending;
    expect(boot.transportViolations.map((v) => v.kind)).toEqual(['window-message']);
    expect(boot.emitted).toEqual([]);
  });

  it('runs a degraded pass when requested', async () => {
    const boot = await bootAndCollect({
      url: 'about:blank',
      runtimePreludeSource,
      readyTimeoutMs: 40,
      settleMs: 0,
      runDegraded: true,
    });
    expect(boot.degraded).not.toBeNull();
    expect(boot.degraded!.bootError).toBeNull();
  });

  it('renders the maintained prelude, the explicit domain allowlist, and the installation probe', () => {
    const script = runtimePrelude(['resource'], '/* shim */');
    expect(script.startsWith('/* shim */')).toBe(true);
    expect(script).toContain('globalThis.NappletShimPrelude.install({"domains":["resource"]});');
    expect(script).toContain("type: '__nappletConformance.installed', installed: !!window.napplet");
    expect(script).not.toContain('resource.bytes');
  });

  // NIP-5D §Security CSP advisory baseline, verbatim when the subject has no http(s) origin.
  it('renders the exact NIP-5D baseline CSP for a subject without an http(s) origin', () => {
    expect(harnessContentSecurityPolicy(null)).toBe(
      "default-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; worker-src 'none'; child-src 'none'; frame-src 'none'; media-src 'none'; object-src 'none'; manifest-src 'none'; base-uri 'none'; form-action 'none'",
    );
  });

  it('adds only the subject origin for its own script, style, image, font, and base loads', () => {
    const policy = harnessContentSecurityPolicy('http://127.0.0.1:4173');
    expect(policy).toContain("script-src 'unsafe-inline' 'wasm-unsafe-eval' http://127.0.0.1:4173");
    expect(policy).toContain("style-src 'unsafe-inline' http://127.0.0.1:4173");
    expect(policy).toContain('img-src data: blob: http://127.0.0.1:4173');
    expect(policy).toContain('font-src data: http://127.0.0.1:4173');
    expect(policy).toContain('base-uri http://127.0.0.1:4173');
    expect(policy).toContain("connect-src 'none'");
    expect(policy).toContain("worker-src 'none'");
    expect(policy).toContain("default-src 'none'");
  });
});
