/**
 * Runtime guard — surfaces a clear, visible error when a napplet is loaded
 * outside a napplet runtime.
 *
 * A napplet is a sandboxed iframe app: a runtime (shell) embeds it and proxies
 * all Nostr access — relays, signing, storage — over postMessage as defined by
 * NIP-5D. When the *same* build is opened on its own — for example served
 * directly from a NIP-5A nsite gateway as a top-level page — there is no shell
 * to answer, every `window.napplet.*` call goes nowhere, and the app silently
 * fails. A visitor just sees a blank or broken page with no explanation.
 *
 * This module detects that situation and renders an explanatory modal (and logs
 * an error) so the failure is legible: the napplet isn't broken, it's simply
 * running without the runtime it depends on. The modal links to the places a
 * visitor needs — a directory of runtimes, the reference runtime, and the spec.
 *
 * Detection:
 *   - Top-level page (`window.self === window.top`): no parent shell can ever
 *     exist, so we fail loudly immediately.
 *   - Nested in an iframe: a real runtime answers `shell.ready` with `shell.init`
 *     near-instantly. We wait briefly; if no envelope arrives from the parent,
 *     the embedder is not a napplet runtime and we fail loudly.
 *
 * Opt-out (for local standalone development) — either is honored:
 *   - `window.__NAPPLET_ALLOW_STANDALONE__ = true` set before the shim loads.
 *   - `<meta name="napplet-allow-standalone">` in the document head.
 *
 * @packageDocumentation
 */

// ─── Help links ────────────────────────────────────────────────────────────
// Canonical source for these URLs is apps/web/src/lib/site.ts (LINKS); kept in
// sync intentionally. These are constants — never interpolate untrusted input.

/** NIP-5D specification (draft PR) — how napplets and runtimes talk. */
export const NIP_5D_SPEC_URL = 'https://github.com/nostr-protocol/nips/pull/2303/files';
/** napplet.run — directory of runtimes a visitor can open napplets in. */
export const NAPPLET_RUN_URL = 'https://napplet.run';
/** kehto/web — the reference, open-source web runtime. */
export const KEHTO_WEB_URL = 'https://github.com/kehto/web';

/**
 * Grace period for the `shell.ready` → `shell.init` handshake when nested in an
 * iframe. A real runtime replies within a few frames; this is generous slack.
 */
export const HANDSHAKE_TIMEOUT_MS = 3000;

// ─── Internal state ─────────────────────────────────────────────────────────

let runtimeConfirmed = false;
let modalShown = false;
let guardTimer: ReturnType<typeof setTimeout> | undefined;

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Mark that a napplet runtime is present. Called by the shim the moment any
 * valid envelope message arrives from `window.parent` (e.g. `shell.init`),
 * which proves a runtime is on the other side and cancels the guard.
 */
export function markRuntimePresent(): void {
  runtimeConfirmed = true;
  if (guardTimer !== undefined) {
    clearTimeout(guardTimer);
    guardTimer = undefined;
  }
}

/**
 * Arm the runtime guard. Idempotent enough to be safe; should be called once at
 * the end of shim install, after `shell.ready` is posted to the parent.
 */
export function installRuntimeGuard(): void {
  if (isStandaloneAllowed()) return;

  if (isTopLevel()) {
    // No parent shell can ever exist — fail loudly right away.
    triggerGuard();
    return;
  }

  // Nested: wait for the handshake; if it never lands, this isn't a runtime.
  guardTimer = setTimeout(() => {
    guardTimer = undefined;
    if (!runtimeConfirmed) triggerGuard();
  }, HANDSHAKE_TIMEOUT_MS);
}

// ─── Detection helpers ──────────────────────────────────────────────────────

function isTopLevel(): boolean {
  try {
    return window.self === window.top;
  } catch {
    // Cross-origin access to window.top can throw; if it does we are nested in
    // an embedding frame, so this is not a top-level page.
    return false;
  }
}

function isStandaloneAllowed(): boolean {
  try {
    if ((window as unknown as { __NAPPLET_ALLOW_STANDALONE__?: unknown }).__NAPPLET_ALLOW_STANDALONE__ === true) {
      return true;
    }
    if (typeof document !== 'undefined' && document.querySelector('meta[name="napplet-allow-standalone"]')) {
      return true;
    }
  } catch {
    /* best-effort */
  }
  return false;
}

// ─── Failure surface ────────────────────────────────────────────────────────

function triggerGuard(): void {
  console.error(
    '[napplet] No napplet runtime detected. This app is a sandboxed napplet and ' +
      'must run inside a napplet runtime (shell) that proxies Nostr access over ' +
      `postMessage per NIP-5D. Open it in a runtime — see ${NAPPLET_RUN_URL}`,
  );
  whenDomReady(renderRuntimeErrorModal);
}

function whenDomReady(fn: () => void): void {
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

function renderRuntimeErrorModal(): void {
  if (modalShown) return;
  if (typeof document === 'undefined' || !document.body) return;
  modalShown = true;

  const host = document.createElement('div');
  host.setAttribute('data-napplet-runtime-error', '');
  // Own a top-most stacking context regardless of the napplet's own CSS.
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;';

  // Shadow root isolates our styles from the napplet's (and vice versa).
  const root: ShadowRoot | HTMLElement = host.attachShadow
    ? host.attachShadow({ mode: 'open' })
    : host;
  root.innerHTML = modalMarkup();

  document.body.appendChild(host);
}

function modalMarkup(): string {
  return `
<style>
  :host { all: initial; }
  * { box-sizing: border-box; }
  .overlay {
    position: fixed; inset: 0;
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    background: rgba(9, 9, 14, 0.82);
    -webkit-backdrop-filter: blur(6px);
    backdrop-filter: blur(6px);
    font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
  .card {
    width: 100%; max-width: 480px;
    background: #14141b; color: #e9e9f1;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 32px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
    line-height: 1.55;
  }
  .badge {
    display: inline-block;
    font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
    color: #8b8ba7; margin-bottom: 14px;
  }
  h1 { margin: 0 0 12px; font-size: 20px; font-weight: 650; letter-spacing: -0.01em; }
  p { margin: 0 0 14px; font-size: 14px; color: #c5c5d6; }
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 12px; padding: 1px 5px; border-radius: 5px;
    background: rgba(255, 255, 255, 0.07); color: #d8d8e6;
  }
  .links { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; }
  a {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 12px 14px; border-radius: 10px; text-decoration: none;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.07);
    color: #e9e9f1; font-size: 13px; font-weight: 550;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  a:hover { background: rgba(124, 108, 255, 0.14); border-color: rgba(124, 108, 255, 0.45); }
  a small { display: block; margin-top: 2px; font-size: 11px; font-weight: 400; color: #8b8ba7; }
  a .arrow { color: #8b8ba7; flex: none; }
</style>
<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="napplet-rg-title">
  <div class="card">
    <span class="badge">Napplet · no runtime</span>
    <h1 id="napplet-rg-title">This napplet can’t run here</h1>
    <p>
      Napplets are sandboxed apps that run <strong>inside a napplet runtime</strong>.
      The runtime proxies all Nostr access — relays, signing, storage — over
      <code>postMessage</code>, the wire format defined by NIP-5D. Opened on its own
      (for example directly from a NIP-5A nsite gateway), there’s no runtime to talk
      to, so nothing loads.
    </p>
    <p>To use this napplet, open it inside a napplet runtime:</p>
    <div class="links">
      <a href="${NAPPLET_RUN_URL}" target="_blank" rel="noopener noreferrer">
        <span>napplet.run<small>Find a runtime to open napplets in</small></span>
        <span class="arrow" aria-hidden="true">→</span>
      </a>
      <a href="${KEHTO_WEB_URL}" target="_blank" rel="noopener noreferrer">
        <span>kehto/web<small>The reference web runtime — open source</small></span>
        <span class="arrow" aria-hidden="true">→</span>
      </a>
      <a href="${NIP_5D_SPEC_URL}" target="_blank" rel="noopener noreferrer">
        <span>NIP-5D specification<small>How napplets and runtimes talk</small></span>
        <span class="arrow" aria-hidden="true">→</span>
      </a>
    </div>
  </div>
</div>`;
}

// ─── Test-only hook ─────────────────────────────────────────────────────────

/**
 * Reset internal guard state. Test-only; not part of the public API.
 * @internal
 */
export function _resetRuntimeGuard(): void {
  runtimeConfirmed = false;
  modalShown = false;
  if (guardTimer !== undefined) {
    clearTimeout(guardTimer);
    guardTimer = undefined;
  }
}
