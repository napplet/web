/**
 * @napplet/conformance -- Browser-side boot harness.
 *
 * {@link bootAndCollect} loads a napplet into a real `sandbox="allow-scripts"`
 * iframe, injects the NIP-5D runtime namespace before subject scripts, attaches
 * a {@link createReferenceShell reference runtime}, and records host-observable
 * postMessage envelopes.
 *
 * The injected namespace is harness plumbing, not protocol surface. It exists so
 * conformance can test the current NIP-5D boundary: runtime-provided domain
 * properties are present before napplet code runs, and wire traffic after boot is
 * regular NAP domain traffic.
 *
 * @packageDocumentation
 */

import { NAP_DOMAINS } from '@napplet/core';
import { createReferenceShell, type RecordedEnvelope } from '../shell/reference-shell.js';
import type { BootObservation } from './context.js';

const INTERNAL_BOOT_ERROR = '__nappletConformance.error';

/** What a host can observe by booting the napplet. */
export interface BootCollection {
  /** True when the harness injected `window.napplet` before subject scripts ran. */
  installedGlobal: boolean;
  /** Boot failure reason, or `null`. */
  bootError: string | null;
  /** Envelopes emitted under a fully-capable runtime. */
  emitted: RecordedEnvelope[];
  /** Observation from the no-domain degraded boot, or `null`. */
  degraded: BootObservation | null;
}

/** Options for {@link bootAndCollect}. */
export interface BootOptions {
  /** The napplet URL to load. */
  url: string;
  /** Milliseconds to await iframe load before declaring boot failure. Default 5000. */
  readyTimeoutMs?: number;
  /** Milliseconds to keep recording envelopes after boot. Default 600. */
  settleMs?: number;
  /** Also run a no-domain degraded boot. Default true. */
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

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function runtimePrelude(domains: readonly string[]): string {
  return `
(() => {
  const domains = ${JSON.stringify(domains)};
  const napplet = {};
  for (const domain of domains) napplet[domain] = {};
  window.napplet = napplet;
  const report = (reason) => {
    try {
      window.parent.postMessage({ type: '${INTERNAL_BOOT_ERROR}', reason: String(reason && reason.message || reason) }, '*');
    } catch {}
  };
  window.addEventListener('error', (event) => report(event.error || event.message));
  window.addEventListener('unhandledrejection', (event) => report(event.reason));
})();
`;
}

function injectRuntime(html: string, url: string, domains: readonly string[]): string {
  const base = `<base href="${escapeHtmlAttr(url)}">`;
  const script = `<script>${runtimePrelude(domains)}</script>`;
  const headOpen = /<head(?:\s[^>]*)?>/i.exec(html);
  if (headOpen) {
    const at = headOpen.index + headOpen[0].length;
    return `${html.slice(0, at)}${base}${script}${html.slice(at)}`;
  }
  return `${base}${script}${html}`;
}

function decodeDataUrl(url: string): string | null {
  if (!url.startsWith('data:')) return null;
  const comma = url.indexOf(',');
  if (comma < 0) return '';
  const meta = url.slice(0, comma);
  const body = url.slice(comma + 1);
  if (meta.endsWith(';base64')) return atob(body);
  return decodeURIComponent(body);
}

async function loadHtml(url: string): Promise<string> {
  if (url === 'about:blank') return '<!doctype html><html><head></head><body></body></html>';
  const data = decodeDataUrl(url);
  if (data !== null) return data;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch napplet HTML: ${response.status} ${response.statusText}`);
  return response.text();
}

/** Boot the napplet once with the given injected domain set and collect what's observable. */
async function bootOnce(
  domains: readonly string[],
  opts: Required<Pick<BootOptions, 'url' | 'readyTimeoutMs' | 'settleMs' | 'allowSameOrigin'>>,
  doc: Document,
  win: Window,
): Promise<SingleBoot> {
  const shell = createReferenceShell();
  const iframe = doc.createElement('iframe');
  iframe.setAttribute('sandbox', opts.allowSameOrigin ? 'allow-scripts allow-same-origin' : 'allow-scripts');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'absolute';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.left = '-9999px';

  let bootError: string | null = null;
  const listener = (event: MessageEvent): void => {
    if (event.source !== iframe.contentWindow) return;
    const data = event.data as { type?: unknown; reason?: unknown } | null;
    if (data && typeof data === 'object' && data.type === INTERNAL_BOOT_ERROR) {
      bootError = `napplet boot error: ${String(data.reason ?? 'unknown error')}`;
      return;
    }
    const responses = shell.handle(event.data);
    const source = event.source as Window | null;
    for (const response of responses) source?.postMessage(response, '*');
  };

  let loaded = false;
  const loadPromise = new Promise<void>((resolve) => {
    iframe.addEventListener('load', () => {
      loaded = true;
      resolve();
    }, { once: true });
  });

  win.addEventListener('message', listener);
  (doc.body ?? doc.documentElement).appendChild(iframe);

  try {
    const html = await loadHtml(opts.url);
    iframe.srcdoc = injectRuntime(html, opts.url, domains);
  } catch (error) {
    bootError = error instanceof Error ? error.message : String(error);
  }

  if (!bootError) {
    const timedOut = Symbol('timeout');
    const race = await Promise.race([loadPromise.then(() => 'loaded' as const), sleep(opts.readyTimeoutMs).then(() => timedOut)]);
    if (race === timedOut || !loaded) {
      bootError = `napplet did not boot (iframe did not load within ${opts.readyTimeoutMs}ms; a conformant napplet must run under sandbox="allow-scripts" without allow-same-origin)`;
    } else {
      await sleep(opts.settleMs);
    }
  }

  win.removeEventListener('message', listener);
  try {
    iframe.remove();
  } catch {
    /* best-effort cleanup */
  }

  return { installedGlobal: bootError === null, bootError, emitted: [...shell.records] };
}

/**
 * Boot a napplet and collect host-observable conformance evidence.
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

  const primary = await bootOnce(NAP_DOMAINS, resolved, doc, win);

  let degraded: BootObservation | null = null;
  if (options.runDegraded ?? true) {
    const d = await bootOnce([], resolved, doc, win);
    degraded = { bootError: d.bootError, emitted: d.emitted };
  }

  return {
    installedGlobal: primary.installedGlobal,
    bootError: primary.bootError,
    emitted: primary.emitted,
    degraded,
  };
}
