import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  installRuntimeGuard,
  markRuntimePresent,
  _resetRuntimeGuard,
  HANDSHAKE_TIMEOUT_MS,
  NIP_5D_SPEC_URL,
  NAPPLET_RUN_URL,
  KEHTO_WEB_URL,
} from './runtime-guard.js';

const MODAL_SELECTOR = '[data-napplet-runtime-error]';

function host(): Element | null {
  return document.body.querySelector(MODAL_SELECTOR);
}

function modalRoot(): ParentNode {
  const h = host();
  if (!h) throw new Error('modal host not present');
  return (h as HTMLElement).shadowRoot ?? (h as ParentNode);
}

/** Pretend this document is the top window, or a nested frame. */
function setTopLevel(isTop: boolean): void {
  Object.defineProperty(window, 'top', {
    value: isTop ? window : ({} as Window),
    configurable: true,
  });
}

beforeEach(() => {
  _resetRuntimeGuard();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  setTopLevel(true);
  delete (window as unknown as { __NAPPLET_ALLOW_STANDALONE__?: unknown }).__NAPPLET_ALLOW_STANDALONE__;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('runtime guard', () => {
  it('renders the error modal when loaded as a top-level page', () => {
    installRuntimeGuard();
    expect(host()).not.toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it('links to napplet.run, kehto/web, and the NIP-5D spec', () => {
    installRuntimeGuard();
    const hrefs = Array.from(modalRoot().querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain(NAPPLET_RUN_URL);
    expect(hrefs).toContain(KEHTO_WEB_URL);
    expect(hrefs).toContain(NIP_5D_SPEC_URL);
  });

  it('does not render when a runtime confirms runtime presence in time', () => {
    vi.useFakeTimers();
    setTopLevel(false);
    installRuntimeGuard();
    markRuntimePresent(); // domain result arrived from the parent
    vi.advanceTimersByTime(HANDSHAKE_TIMEOUT_MS + 100);
    expect(host()).toBeNull();
  });

  it('renders when embedded in a non-runtime iframe (no runtime presence)', () => {
    vi.useFakeTimers();
    setTopLevel(false);
    installRuntimeGuard();
    expect(host()).toBeNull(); // not yet — still within grace period
    vi.advanceTimersByTime(HANDSHAKE_TIMEOUT_MS + 100);
    expect(host()).not.toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it('respects the standalone opt-out global', () => {
    (window as unknown as { __NAPPLET_ALLOW_STANDALONE__?: boolean }).__NAPPLET_ALLOW_STANDALONE__ = true;
    installRuntimeGuard();
    expect(host()).toBeNull();
  });

  it('respects the standalone opt-out meta tag', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'napplet-allow-standalone');
    document.head.appendChild(meta);
    installRuntimeGuard();
    expect(host()).toBeNull();
  });

  it('never renders the modal more than once', () => {
    installRuntimeGuard();
    installRuntimeGuard();
    expect(document.body.querySelectorAll(MODAL_SELECTOR).length).toBe(1);
  });
});
