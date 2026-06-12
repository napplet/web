/**
 * VER-11 + VER-12 shim-side tests for the connect NAP (Phase 142-02).
 *
 * Covers:
 * - VER-12 (primary): graceful degradation — `window.napplet.connect` is ALWAYS
 *   populated after `installConnectShim()`, defaulting to
 *   `{granted: false, origins: []}` when no meta tag is present or content
 *   is empty. It is NEVER undefined.
 * - VER-11 (N/A for connect): connect has no postMessage wire protocol —
 *   grants flow through the shell-emitted CSP + meta tag, not envelopes.
 *   This file therefore only exercises the meta-tag reading path.
 *
 * Runs under vitest's 'node' environment (per repo vitest.config.ts), so
 * tests stub both `globalThis.window` AND `globalThis.document`. The shim's
 * `readGrantedMeta()` helper calls `document.querySelector(...)`, which is
 * the sole DOM touchpoint of the whole module.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let windowStub: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let documentStub: any;

/** Install a stubbed meta tag with the given content, or make the tag absent. */
function stubMetaTag(content: string | null): void {
  documentStub.querySelector = (selector: string): unknown => {
    if (selector !== 'meta[name="napplet-connect-granted"]') return null;
    if (content === null) return null;
    return {
      getAttribute: (name: string): string | null =>
        name === 'content' ? content : null,
    };
  };
}

beforeEach(() => {
  windowStub = {};
  documentStub = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = windowStub;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).document = documentStub;
  vi.resetModules();
});

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).window;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).document;
});

// ─── installConnectShim() — graceful degradation (VER-12) ───────────────────

describe('installConnectShim() — graceful degradation (VER-12)', () => {
  it('no meta tag → {granted: false, origins: []} (NEVER undefined)', async () => {
    stubMetaTag(null);
    const { installConnectShim } = await import('./shim.js');
    installConnectShim();
    expect(windowStub.napplet).toBeDefined();
    expect(windowStub.napplet.connect).toBeDefined();
    expect(windowStub.napplet.connect).not.toBeUndefined();
    expect(windowStub.napplet.connect.granted).toBe(false);
    expect(windowStub.napplet.connect.origins).toEqual([]);
  });

  it('empty-content meta tag → {granted: false, origins: []}', async () => {
    stubMetaTag('');
    const { installConnectShim } = await import('./shim.js');
    installConnectShim();
    expect(windowStub.napplet.connect.granted).toBe(false);
    expect(windowStub.napplet.connect.origins).toEqual([]);
  });

  it('whitespace-only meta content → {granted: false, origins: []}', async () => {
    stubMetaTag('   \t  \n ');
    const { installConnectShim } = await import('./shim.js');
    installConnectShim();
    expect(windowStub.napplet.connect.granted).toBe(false);
    expect(windowStub.napplet.connect.origins).toEqual([]);
  });
});

// ─── installConnectShim() — populated grant state ───────────────────────────

describe('installConnectShim() — populated grant state', () => {
  it('populates origins from whitespace-separated meta content (single origin)', async () => {
    stubMetaTag('https://api.example.com');
    const { installConnectShim } = await import('./shim.js');
    installConnectShim();
    expect(windowStub.napplet.connect.granted).toBe(true);
    expect(windowStub.napplet.connect.origins).toEqual(['https://api.example.com']);
  });

  it('populates origins from whitespace-separated meta content (multiple origins)', async () => {
    stubMetaTag('https://api.example.com https://foo.com wss://events.example.com');
    const { installConnectShim } = await import('./shim.js');
    installConnectShim();
    expect(windowStub.napplet.connect.granted).toBe(true);
    expect(windowStub.napplet.connect.origins).toEqual([
      'https://api.example.com',
      'https://foo.com',
      'wss://events.example.com',
    ]);
  });

  it('tolerates mixed whitespace separators (spaces, tabs, newlines)', async () => {
    stubMetaTag('https://a.com\thttps://b.com\n https://c.com');
    const { installConnectShim } = await import('./shim.js');
    installConnectShim();
    expect(windowStub.napplet.connect.granted).toBe(true);
    expect(windowStub.napplet.connect.origins).toEqual([
      'https://a.com',
      'https://b.com',
      'https://c.com',
    ]);
  });

  it('origins is a frozen readonly array (mutation is a no-op)', async () => {
    stubMetaTag('https://a.com https://b.com');
    const { installConnectShim } = await import('./shim.js');
    installConnectShim();
    expect(Object.isFrozen(windowStub.napplet.connect.origins)).toBe(true);
    // Mutation attempt silently fails in sloppy mode or throws in strict mode;
    // either way the array is unchanged.
    expect(() => {
      (windowStub.napplet.connect.origins as string[]).push('https://c.com');
    }).toThrow();
    expect(windowStub.napplet.connect.origins.length).toBe(2);
  });
});

// ─── Idempotency + cleanup ──────────────────────────────────────────────────

describe('installConnectShim() — idempotency & cleanup', () => {
  it('double-install returns no-op cleanup; first install remains authoritative', async () => {
    stubMetaTag('https://api.example.com');
    const { installConnectShim } = await import('./shim.js');
    const cleanup1 = installConnectShim();
    // Change meta content before second install to confirm the second call
    // is a genuine no-op (does not re-read + re-mount).
    stubMetaTag('https://different.com');
    const cleanup2 = installConnectShim();
    expect(typeof cleanup2).toBe('function');
    // The first install's state remains — granted: true with the original origin.
    expect(windowStub.napplet.connect.granted).toBe(true);
    expect(windowStub.napplet.connect.origins).toEqual(['https://api.example.com']);
    // Second cleanup must NOT tear down the first install.
    cleanup2();
    expect(windowStub.napplet.connect).toBeDefined();
    expect(windowStub.napplet.connect.origins).toEqual(['https://api.example.com']);
    // First cleanup removes the mount.
    cleanup1();
    expect(windowStub.napplet.connect).toBeUndefined();
  });

  it('cleanup removes window.napplet.connect and resets state', async () => {
    stubMetaTag('https://api.example.com');
    const { installConnectShim } = await import('./shim.js');
    const cleanup = installConnectShim();
    expect(windowStub.napplet.connect).toBeDefined();
    expect(windowStub.napplet.connect.granted).toBe(true);
    cleanup();
    expect(windowStub.napplet.connect).toBeUndefined();
  });

  it('re-install after cleanup starts fresh from current meta state', async () => {
    stubMetaTag('https://first.com');
    const { installConnectShim } = await import('./shim.js');
    const cleanup1 = installConnectShim();
    expect(windowStub.napplet.connect.origins).toEqual(['https://first.com']);
    cleanup1();
    // Meta content changes between installs → re-install picks up new state.
    stubMetaTag('https://second.com');
    installConnectShim();
    expect(windowStub.napplet.connect.origins).toEqual(['https://second.com']);
  });
});
