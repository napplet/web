/**
 * VER-11 + VER-12 shim-side tests for the class NAP (Phase 142-02).
 *
 * Covers:
 * - VER-11: class.assigned wire dispatch updates window.napplet.class to the
 *   integer carried by the envelope (both class: 1 and class: 2 cases).
 * - VER-12: graceful degradation — window.napplet.class === undefined before
 *   any envelope arrives; invalid shapes (negative, non-integer, wrong type,
 *   missing field) are silently dropped per the spec.
 *
 * Because vitest runs in the 'node' environment (per repo vitest.config.ts),
 * these tests stub `globalThis.window` directly rather than rely on jsdom.
 * `vi.resetModules()` is called per-test so the shim's module-local
 * `currentClass` + `installed` state resets between test cases.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let windowStub: any;

beforeEach(() => {
  windowStub = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = windowStub;
  vi.resetModules();
});

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).window;
});

// ─── installClassShim() ─────────────────────────────────────────────────────

describe('installClassShim() — graceful degradation (VER-12)', () => {
  it('mounts window.napplet.class as undefined by default (no prior class.assigned)', async () => {
    const { installClassShim } = await import('./shim.js');
    installClassShim();
    expect(windowStub.napplet).toBeDefined();
    expect(windowStub.napplet.class).toBeUndefined();
  });

  it('NEVER defaults to 0 (graceful-degradation sentinel is undefined, not numeric)', async () => {
    const { installClassShim } = await import('./shim.js');
    installClassShim();
    expect(windowStub.napplet.class).not.toBe(0);
    expect(windowStub.napplet.class).not.toBe(null);
    expect(windowStub.napplet.class).toBeUndefined();
  });

  it('double-install returns a no-op cleanup (idempotent)', async () => {
    const { installClassShim } = await import('./shim.js');
    const cleanup1 = installClassShim();
    const cleanup2 = installClassShim();
    expect(typeof cleanup2).toBe('function');
    // Second cleanup must NOT tear down the first installation.
    cleanup2();
    expect(windowStub.napplet).toBeDefined();
    // First cleanup still works.
    cleanup1();
  });
});

// ─── handleClassMessage() ───────────────────────────────────────────────────

describe('handleClassMessage() — class.assigned wire dispatch (VER-11)', () => {
  it('updates window.napplet.class to 2 on class.assigned with class: 2', async () => {
    const { installClassShim, handleClassMessage } = await import('./shim.js');
    installClassShim();
    expect(windowStub.napplet.class).toBeUndefined();
    handleClassMessage({ type: 'class.assigned', id: 'c-1', class: 2 });
    expect(windowStub.napplet.class).toBe(2);
  });

  it('updates window.napplet.class to 1 on class.assigned with class: 1', async () => {
    const { installClassShim, handleClassMessage } = await import('./shim.js');
    installClassShim();
    handleClassMessage({ type: 'class.assigned', id: 'c-2', class: 1 });
    expect(windowStub.napplet.class).toBe(1);
  });

  it('last-write-wins: idempotent re-assignment accepted (class: 1 → class: 3)', async () => {
    const { installClassShim, handleClassMessage } = await import('./shim.js');
    installClassShim();
    handleClassMessage({ type: 'class.assigned', id: 'c-1', class: 1 });
    expect(windowStub.napplet.class).toBe(1);
    handleClassMessage({ type: 'class.assigned', id: 'c-2', class: 3 });
    expect(windowStub.napplet.class).toBe(3);
  });

  it('accepts class: 0 (zero is a non-negative integer per spec)', async () => {
    // Spec: "non-negative integer". 0 qualifies. Future NAP-CLASS-0 possible.
    const { installClassShim, handleClassMessage } = await import('./shim.js');
    installClassShim();
    handleClassMessage({ type: 'class.assigned', id: 'c-1', class: 0 });
    expect(windowStub.napplet.class).toBe(0);
  });
});

describe('handleClassMessage() — invalid shapes silently dropped (VER-12)', () => {
  it('silently drops negative class (-1)', async () => {
    const { installClassShim, handleClassMessage } = await import('./shim.js');
    installClassShim();
    handleClassMessage({ type: 'class.assigned', id: 'c-1', class: 2 });
    expect(windowStub.napplet.class).toBe(2);
    handleClassMessage({ type: 'class.assigned', id: 'c-2', class: -1 });
    expect(windowStub.napplet.class).toBe(2); // unchanged
  });

  it('silently drops non-integer class (1.5)', async () => {
    const { installClassShim, handleClassMessage } = await import('./shim.js');
    installClassShim();
    handleClassMessage({ type: 'class.assigned', id: 'c-1', class: 2 });
    handleClassMessage({ type: 'class.assigned', id: 'c-2', class: 1.5 });
    expect(windowStub.napplet.class).toBe(2); // unchanged
  });

  it('silently drops non-number class (string "2")', async () => {
    const { installClassShim, handleClassMessage } = await import('./shim.js');
    installClassShim();
    handleClassMessage({ type: 'class.assigned', id: 'c-1', class: 1 });
    handleClassMessage({ type: 'class.assigned', id: 'c-2', class: '2' as unknown as number });
    expect(windowStub.napplet.class).toBe(1); // unchanged
  });

  it('ignores non-class.assigned types (class.other)', async () => {
    const { installClassShim, handleClassMessage } = await import('./shim.js');
    installClassShim();
    handleClassMessage({ type: 'class.other', id: 'c-1', class: 2 });
    expect(windowStub.napplet.class).toBeUndefined();
  });

  it('ignores class.assigned with missing class field', async () => {
    const { installClassShim, handleClassMessage } = await import('./shim.js');
    installClassShim();
    handleClassMessage({ type: 'class.assigned', id: 'c-1' });
    expect(windowStub.napplet.class).toBeUndefined();
  });

  it('ignores envelopes from entirely different domains (relay.*)', async () => {
    const { installClassShim, handleClassMessage } = await import('./shim.js');
    installClassShim();
    handleClassMessage({ type: 'relay.subscribe', id: 'r-1' });
    expect(windowStub.napplet.class).toBeUndefined();
  });
});

// ─── Cleanup ────────────────────────────────────────────────────────────────

describe('installClassShim() cleanup', () => {
  it('cleanup resets state and deletes window.napplet.class', async () => {
    const { installClassShim, handleClassMessage } = await import('./shim.js');
    const cleanup = installClassShim();
    handleClassMessage({ type: 'class.assigned', id: 'c-1', class: 2 });
    expect(windowStub.napplet.class).toBe(2);
    cleanup();
    // Post-cleanup the getter is removed; reading returns undefined.
    expect(windowStub.napplet.class).toBeUndefined();
  });

  it('post-cleanup re-install starts fresh at undefined', async () => {
    const { installClassShim, handleClassMessage } = await import('./shim.js');
    const cleanup1 = installClassShim();
    handleClassMessage({ type: 'class.assigned', id: 'c-1', class: 2 });
    cleanup1();
    installClassShim();
    // Fresh install reads undefined until next envelope arrives.
    expect(windowStub.napplet.class).toBeUndefined();
  });
});
