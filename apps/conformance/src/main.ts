/**
 * napplet conformance runtime — a single-window web app that loads a napplet by
 * URL and runs the @napplet/conformance engine live in the browser, rendering a
 * per-check tree, the recorded envelope log, and a manifest inspector.
 *
 * It reuses the exact same engine the headless CLI uses, so verdicts match.
 *
 * **Live mode** (`?live=1`, used when launched via `napplet-conformance --ui`):
 * the app subscribes to a Server-Sent-Events stream and re-runs conformance every
 * time the napplet changes — the watch loop, the way `vitest --ui` re-runs on save.
 */

import {
  bootAndCollect,
  buildContext,
  runConformance,
  validateManifest,
  type ConformanceRun,
  type RecordedEnvelope,
} from '@napplet/conformance';
import './app.css';

const FORBIDDEN_RE = /\bwindow\s*\.\s*nostr\b|\bglobalThis\s*\.\s*nostr\b/;
/** SSE endpoint the `--ui` CLI server exposes; relative to the app origin. */
const SSE_PATH = '/__conformance__/events';

const params = new URLSearchParams(location.search);
const LIVE = params.get('live') === '1';

function esc(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const app = document.getElementById('app')!;

function shell(): {
  urlInput: HTMLInputElement;
  runButton: HTMLButtonElement;
  rerunButton: HTMLButtonElement;
  liveBadge: HTMLElement;
  status: HTMLElement;
  output: HTMLElement;
} {
  app.innerHTML = `
    <header class="masthead">
      <h1>napplet conformance ${LIVE ? '<span class="live-badge" id="live-badge">● live</span>' : ''}</h1>
      <p>Load a napplet by URL and run NAP protocol conformance live. Same engine as <code>napplet-conformance</code> CI.</p>
    </header>
    <form id="run-form" class="runbar">
      <input id="url" type="url" placeholder="https://localhost:5173/  (a napplet served with permissive CORS)" autocomplete="off" />
      <button id="run" type="submit">Run conformance</button>
      <button id="rerun" type="button" class="secondary" hidden>Re-run</button>
    </form>
    <p id="status" class="status" role="status"></p>
    <section id="output" class="output"></section>
  `;
  return {
    urlInput: app.querySelector<HTMLInputElement>('#url')!,
    runButton: app.querySelector<HTMLButtonElement>('#run')!,
    rerunButton: app.querySelector<HTMLButtonElement>('#rerun')!,
    liveBadge: app.querySelector<HTMLElement>('#live-badge') ?? document.createElement('span'),
    status: app.querySelector<HTMLElement>('#status')!,
    output: app.querySelector<HTMLElement>('#output')!,
  };
}

const ui = shell();
let currentUrl = '';
let runCount = 0;

function setStatus(text: string, kind: 'info' | 'error' = 'info'): void {
  ui.status.textContent = text;
  ui.status.dataset.kind = kind;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function clockFromMs(ms: number): string {
  // Avoid Date.now(); derive HH:MM:SS from a passed timestamp via the Date the
  // browser already has on the event. Callers pass run.finishedAt.
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function fetchManifest(url: string): Promise<{ html: string; forbidden: string[]; fetched: boolean }> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    const html = await res.text();
    return { html, forbidden: FORBIDDEN_RE.test(html) ? ['window.nostr'] : [], fetched: true };
  } catch {
    return { html: '', forbidden: [], fetched: false };
  }
}

function renderChecks(run: ConformanceRun): string {
  const verdict = run.ok ? 'conformant' : 'non-conformant';
  const areas = [...new Set(run.checks.map((c) => c.area))];
  const groups = areas
    .map((area) => {
      const rows = run.checks
        .filter((c) => c.area === area)
        .map((c) => {
          const sev = c.severity === 'warning' && c.status === 'fail' ? ' <span class="tag warn">warning</span>' : '';
          const detail = c.detail ? `<span class="detail">${esc(c.detail)}</span>` : '';
          return `<li class="check ${c.status}"><span class="badge ${c.status}">${c.status}</span><span class="id">${esc(c.id)}</span>${sev}${detail}</li>`;
        })
        .join('');
      return `<div class="area"><h3>${esc(area)}</h3><ul>${rows}</ul></div>`;
    })
    .join('');

  const s = run.summary;
  const stamp = runCount > 1 ? `<span class="run-stamp">run #${runCount} · ${clockFromMs(run.finishedAt)}</span>` : '';
  return `
    <div class="verdict ${verdict}">
      <span class="result">${run.ok ? 'CONFORMANT' : 'NON-CONFORMANT'}</span>
      <span class="counts">${s.passed} passed · ${s.failed} failed · ${s.skipped} skipped${s.warnings ? ` · ${s.warnings} warning(s)` : ''}</span>
      ${stamp}
    </div>
    <div class="checks">${groups}</div>
  `;
}

function renderEnvelopes(emitted: RecordedEnvelope[]): string {
  if (emitted.length === 0) return `<p class="empty">No envelopes were emitted.</p>`;
  const rows = emitted
    .map((r) => {
      const okClass = r.verdict.ok ? 'ok' : 'bad';
      const errs = r.verdict.ok ? '' : `<div class="errs">${r.verdict.errors.map((e) => esc(`${e.code}: ${e.message}`)).join('<br>')}</div>`;
      return `<li class="env ${okClass}"><code>${esc(JSON.stringify(r.envelope))}</code>${errs}</li>`;
    })
    .join('');
  return `<ul class="envlog">${rows}</ul>`;
}

function renderManifest(html: string, fetched: boolean): string {
  if (!fetched) {
    return `<p class="empty">Couldn't fetch the napplet HTML (likely CORS). Serve it with <code>Access-Control-Allow-Origin: *</code>, or use the CLI for the authoritative manifest checks.</p>`;
  }
  const m = validateManifest(html);
  const row = (k: string, v: unknown) => `<tr><th>${esc(k)}</th><td>${v ? esc(String(v)) : '<em>—</em>'}</td></tr>`;
  return `
    <table class="manifest">
      ${row('napplet-type', m.nappletType)}
      ${row('requires', m.requires.join(', '))}
    </table>
    ${m.errors.length ? `<div class="errs">${m.errors.map((e) => esc(`${e.code}: ${e.message}`)).join('<br>')}</div>` : ''}
  `;
}

function render(run: ConformanceRun, emitted: RecordedEnvelope[], html: string, fetched: boolean): void {
  ui.output.innerHTML = `
    ${renderChecks(run)}
    <div class="panels">
      <section class="panel"><h2>Emitted envelopes (${emitted.length})</h2>${renderEnvelopes(emitted)}</section>
      <section class="panel"><h2>Manifest</h2>${renderManifest(html, fetched)}</section>
    </div>
  `;
}

async function run(url: string): Promise<void> {
  currentUrl = url;
  ui.runButton.disabled = true;
  ui.rerunButton.disabled = true;
  try {
    setStatus(`Fetching manifest for ${url} …`);
    const { html, forbidden, fetched } = await fetchManifest(url);
    setStatus('Booting napplet in a sandboxed iframe …');
    const boot = await bootAndCollect({ url, readyTimeoutMs: 5000, settleMs: 800, runDegraded: true });
    const ctx = buildContext({ manifestHtml: html, boot, forbiddenGlobals: forbidden });
    const result = runConformance(ctx);
    runCount += 1;
    setStatus(result.ok ? 'Done — conformant.' : 'Done — non-conformant.', result.ok ? 'info' : 'error');
    render(result, boot.emitted, html, fetched);
    ui.rerunButton.hidden = false;
  } catch (err) {
    setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`, 'error');
  } finally {
    ui.runButton.disabled = false;
    ui.rerunButton.disabled = false;
  }
}

/** Subscribe to the `--ui` server's change stream and re-run on each event. */
function connectLive(): void {
  if (!LIVE || typeof EventSource === 'undefined') return;
  let scheduled = false;
  const source = new EventSource(SSE_PATH);
  source.addEventListener('rerun', () => {
    if (!currentUrl || scheduled) return;
    scheduled = true;
    // Coalesce bursts of file events into a single re-run.
    setTimeout(() => {
      scheduled = false;
      void run(currentUrl);
    }, 50);
  });
  source.addEventListener('open', () => {
    if (ui.liveBadge) ui.liveBadge.dataset.state = 'connected';
  });
  source.addEventListener('error', () => {
    if (ui.liveBadge) ui.liveBadge.dataset.state = 'disconnected';
  });
}

ui.runButton.parentElement!.addEventListener('submit', (e) => {
  e.preventDefault();
  const url = ui.urlInput.value.trim();
  if (url) {
    const next = new URL(location.href);
    next.searchParams.set('url', url);
    history.replaceState(null, '', next);
    void run(url);
  }
});

ui.rerunButton.addEventListener('click', () => {
  if (currentUrl) void run(currentUrl);
});

connectLive();

// Deep-link support: ?url=… runs immediately.
const initial = params.get('url');
if (initial) {
  ui.urlInput.value = initial;
  void run(initial);
}
