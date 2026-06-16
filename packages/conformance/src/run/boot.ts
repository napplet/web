/**
 * @napplet/conformance -- Browser-side boot harness.
 *
 * {@link bootAndCollect} loads a napplet into a real `sandbox="allow-scripts"`
 * iframe, attaches a {@link createReferenceShell reference shell}, and observes what
 * a host can actually see across the sandbox boundary:
 *
 *  - **installedGlobal / bootError** — derived from the shim's `shell.ready`
 *    postMessage. A no-`same-origin` sandbox is opaque to the parent, so
 *    `window.napplet` cannot be introspected directly; `shell.ready` is the real
 *    boot signal, and its absence within the timeout is how same-origin reliance
 *    (or a crash-on-boot) manifests.
 *  - **emitted** — every envelope the napplet posts, recorded with a verdict.
 *  - **degraded** — an optional second boot under a no-capability shell to prove
 *    graceful degradation.
 *
 * This is browser-safe DOM code shared by the Playwright CLI host page and the
 * standalone web runtime. Forbidden-global access (e.g. `window.nostr`) is NOT
 * observable across the sandbox and is supplied separately by the host via static
 * analysis.
 *
 * @packageDocumentation
 */

import {
  createReferenceShell,
  type RecordedEnvelope,
  type ShellCapabilities,
} from '../shell/reference-shell.js';
import type { BootObservation } from './context.js';

/** What a host can observe by booting the napplet. */
export interface BootCollection {
  /** True when the napplet posted `shell.ready` (its shim installed and ran). */
  installedGlobal: boolean;
  /** Boot failure reason, or `null`. */
  bootError: string | null;
  /** Envelopes emitted under a fully-capable shell. */
  emitted: RecordedEnvelope[];
  /** Observation from the no-capability degraded boot, or `null`. */
  degraded: BootObservation | null;
}

/** Options for {@link bootAndCollect}. */
export interface BootOptions {
  /** The napplet URL to load. */
  url: string;
  /** Milliseconds to await `shell.ready` before declaring boot failure. Default 5000. */
  readyTimeoutMs?: number;
  /** Milliseconds to keep recording envelopes after `shell.ready`. Default 600. */
  settleMs?: number;
  /** Also run a no-capability degraded boot. Default true. */
  runDegraded?: boolean;
  /** Debug only: also grant `allow-same-origin` (a conformant load must NOT need it). Default false. */
  allowSameOrigin?: boolean;
  /** Document to create the iframe in. Defaults to the global `document`. */
  document?: Document;
  /** Window to listen on. Defaults to the global `window`. */
  window?: Window;
}

interface SingleBoot {
  installedGlobal: boolean;
  bootError: string | null;
  emitted: RecordedEnvelope[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Boot the napplet once with the given capabilities and collect what's observable. */
async function bootOnce(
  caps: Partial<ShellCapabilities> | undefined,
  opts: Required<Pick<BootOptions, 'url' | 'readyTimeoutMs' | 'settleMs' | 'allowSameOrigin'>>,
  doc: Document,
  win: Window,
): Promise<SingleBoot> {
  const shell = createReferenceShell(caps ? { capabilities: caps } : undefined);
  const iframe = doc.createElement('iframe');
  iframe.setAttribute('sandbox', opts.allowSameOrigin ? 'allow-scripts allow-same-origin' : 'allow-scripts');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'absolute';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.left = '-9999px';

  let resolveReady!: () => void;
  const readyPromise = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  const listener = (event: MessageEvent): void => {
    if (event.source !== iframe.contentWindow) return;
    const responses = shell.handle(event.data);
    const source = event.source as Window | null;
    for (const response of responses) source?.postMessage(response, '*');
    const data = event.data as { type?: unknown } | null;
    if (data && typeof data === 'object' && data.type === 'shell.ready') resolveReady();
  };

  win.addEventListener('message', listener);
  (doc.body ?? doc.documentElement).appendChild(iframe);
  iframe.setAttribute('src', opts.url);

  let installedGlobal = false;
  let bootError: string | null = null;
  const timedOut = Symbol('timeout');
  const race = await Promise.race([readyPromise.then(() => 'ready' as const), sleep(opts.readyTimeoutMs).then(() => timedOut)]);
  if (race === timedOut) {
    bootError = `napplet did not boot (no shell.ready within ${opts.readyTimeoutMs}ms; a conformant napplet must run under sandbox="allow-scripts" without allow-same-origin)`;
  } else {
    installedGlobal = true;
    await sleep(opts.settleMs); // collect startup envelopes
  }

  win.removeEventListener('message', listener);
  try {
    iframe.remove();
  } catch {
    /* best-effort cleanup */
  }

  return { installedGlobal, bootError, emitted: [...shell.records] };
}

/**
 * Boot a napplet and collect host-observable conformance evidence.
 *
 * @example
 * ```ts
 * const boot = await bootAndCollect({ url: '/index.html' });
 * // hand `boot` to runConformance via a ConformanceContext on the node side
 * ```
 */
export async function bootAndCollect(options: BootOptions): Promise<BootCollection> {
  const doc = options.document ?? document;
  const win = options.window ?? window;
  const resolved = {
    url: options.url,
    readyTimeoutMs: options.readyTimeoutMs ?? 5000,
    settleMs: options.settleMs ?? 600,
    allowSameOrigin: options.allowSameOrigin ?? false,
  };

  const primary = await bootOnce(undefined, resolved, doc, win);

  let degraded: BootObservation | null = null;
  if (options.runDegraded ?? true) {
    const d = await bootOnce({ naps: [], sandbox: [] }, resolved, doc, win);
    degraded = { bootError: d.bootError, emitted: d.emitted };
  }

  return {
    installedGlobal: primary.installedGlobal,
    bootError: primary.bootError,
    emitted: primary.emitted,
    degraded,
  };
}
