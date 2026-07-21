/**
 * napplet conformance runtime — a single-window web app that loads a napplet by
 * NIP-19 pointer and runs the @napplet/conformance engine live in the browser,
 * rendering a per-check tree, the recorded envelope log, and a manifest inspector.
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
  manifestDisplayName,
  runConformance,
  validateManifestEvent,
  type ConformanceRun,
  type RecordedEnvelope,
} from '@napplet/conformance';
import { resolveTarget, type ResolvedTarget } from './target.js';
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
  targetInput: HTMLInputElement;
  runButton: HTMLButtonElement;
  rerunButton: HTMLButtonElement;
  liveBadge: HTMLElement;
  status: HTMLElement;
  output: HTMLElement;
} {
  app.innerHTML = `
    <header class="masthead">
      <h1>napplet conformance ${LIVE ? '<span class="live-badge" id="live-badge">● live</span>' : ''}</h1>
      <p>Load a napplet by <code>nevent</code> or <code>naddr</code> and run NAP protocol conformance live. Same engine as <code>napplet-conformance</code> CI.</p>
    </header>
    <form id="run-form" class="runbar">
      <input id="target" type="text" placeholder="naddr1… or nevent1… for a NIP-5D napplet manifest" autocomplete="off" spellcheck="false" />
      <button id="run" type="submit">Run conformance</button>
      <button id="rerun" type="button" class="secondary" hidden>Re-run</button>
    </form>
    <p id="status" class="status" role="status"></p>
    <section id="output" class="output"></section>
  `;
  return {
    targetInput: app.querySelector<HTMLInputElement>('#target')!,
    runButton: app.querySelector<HTMLButtonElement>('#run')!,
    rerunButton: app.querySelector<HTMLButtonElement>('#rerun')!,
    liveBadge: app.querySelector<HTMLElement>('#live-badge') ?? document.createElement('span'),
    status: app.querySelector<HTMLElement>('#status')!,
    output: app.querySelector<HTMLElement>('#output')!,
  };
}

const ui = shell();
let currentTarget = '';
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

function renderManifest(target: ResolvedTarget): string {
  const row = (k: string, v: unknown) => `<tr><th>${esc(k)}</th><td>${v ? esc(String(v)) : '<em>—</em>'}</td></tr>`;
  if (target.manifestEvent) {
    const event = target.manifestEvent;
    const v = validateManifestEvent(event);
    const dTag = event.tags.find((tag) => tag[0] === 'd')?.[1];
    const index = event.tags.find((tag) => tag[0] === 'path' && tag[1] === '/index.html');
    const servers = event.tags.filter((tag) => tag[0] === 'server').map((tag) => tag[1]).filter(Boolean);
    return `
      <table class="manifest">
        ${row('event', event.id)}
        ${row('kind', event.kind)}
        ${row('d', dTag)}
        ${row('name', manifestDisplayName(event))}
        ${row('requires', v.requires.join(', '))}
        ${row('/index.html', index?.[2])}
        ${row('servers', servers.join(', '))}
      </table>
      ${v.errors.length ? `<div class="errs">${v.errors.map((e) => esc(`${e.code}: ${e.message}`)).join('<br>')}</div>` : ''}
    `;
  }
  if (!target.fetched) {
    return `<p class="empty">Couldn't fetch the local URL HTML, likely because of CORS. Use a NIP-19 <code>nevent</code>/<code>naddr</code> for authoritative manifest checks, or use the CLI for local URL runs.</p>`;
  }
  return `<p class="empty">Local URL mode booted raw HTML. It does not include a signed NIP-5D manifest event, so manifest-event checks are skipped.</p>`;
}

function render(run: ConformanceRun, emitted: RecordedEnvelope[], target: ResolvedTarget): void {
  ui.output.innerHTML = `
    ${renderChecks(run)}
    <div class="panels">
      <section class="panel"><h2>Emitted envelopes (${emitted.length})</h2>${renderEnvelopes(emitted)}</section>
      <section class="panel"><h2>Manifest</h2>${renderManifest(target)}</section>
    </div>
  `;
}

async function run(target: string): Promise<void> {
  currentTarget = target;
  ui.runButton.disabled = true;
  ui.rerunButton.disabled = true;
  let resolved: ResolvedTarget | null = null;
  try {
    setStatus(`Resolving ${target} …`);
    resolved = await resolveTarget(target);
    const forbidden = FORBIDDEN_RE.test(resolved.html) ? ['window.nostr'] : [];
    setStatus('Booting napplet in a sandboxed iframe …');
    const boot = await bootAndCollect({ url: resolved.bootUrl, readyTimeoutMs: 5000, settleMs: 800, runDegraded: true });
    const ctx = buildContext({
      manifestHtml: resolved.html,
      manifestEvent: resolved.manifestEvent,
      boot,
      forbiddenGlobals: forbidden,
    });
    const result = runConformance(ctx);
    runCount += 1;
    setStatus(result.ok ? 'Done — conformant.' : 'Done — non-conformant.', result.ok ? 'info' : 'error');
    render(result, boot.emitted, resolved);
    ui.rerunButton.hidden = false;
  } catch (err) {
    setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`, 'error');
  } finally {
    resolved?.revoke?.();
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
    if (!currentTarget || scheduled) return;
    scheduled = true;
    // Coalesce bursts of file events into a single re-run.
    setTimeout(() => {
      scheduled = false;
      void run(currentTarget);
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
  const target = ui.targetInput.value.trim();
  if (target) {
    const next = new URL(location.href);
    next.searchParams.set('target', target);
    next.searchParams.delete('url');
    history.replaceState(null, '', next);
    void run(target);
  }
});

ui.rerunButton.addEventListener('click', () => {
  if (currentTarget) void run(currentTarget);
});

connectLive();

// Deep-link support: ?target=… runs immediately. ?url=… remains for local dev links.
const initial = params.get('target') ?? params.get('url');
if (initial) {
  ui.targetInput.value = initial;
  void run(initial);
}
