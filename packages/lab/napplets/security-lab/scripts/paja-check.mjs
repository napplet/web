#!/usr/bin/env node
// End-to-end check of the built artifact inside Kehto Paja's runtime-pointer
// host (the same srcdoc + injected-CSP path a published napplet takes):
//   1. serve Paja's host page locally, load dist/index.html through its
//      "Open file" input, and wait for every non-destructive probe to settle;
//   2. print the table and fail on any `fail` row or any revocation during
//      "run all";
//   3. run each destructive probe on a fresh load and require Paja to revoke
//      the lab with a NIP-5D reason, remove the frame, and never leave an
//      unverified replacement document rendering.
// Needs a built dist/ and a Playwright Chromium (`npx playwright install chromium`).

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createPajaRuntimeHostConfig, renderPajaHtml } from '@kehto/paja';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(root, 'dist/index.html');
const PAJA_DIST = dirname(fileURLToPath(import.meta.resolve('@kehto/paja')));
const DESTRUCTIVE_IDS = (process.env.LAB_DESTRUCTIVE ?? 'revoke.window.message,frame.lock.blob').split(',').filter(Boolean);
// kehto/web#382 puts frame-src 'none' on the Paja host page. Until a Paja release
// carries it, LAB_HOST_FRAME_LOCK=1 injects the same meta into the rendered host
// so the blob self-navigation probe can be exercised against a locked host.
const HOST_FRAME_LOCK = process.env.LAB_HOST_FRAME_LOCK === '1';
const BANNER = 'UNVERIFIED DOCUMENT IN THE NAPPLET FRAME';

// Guard against string-matching injectors (see catalog.test.ts "artifact safety"):
// the built artifact must contain exactly one <head and no CSP meta of its own.
const artifact = readFileSync(DIST, 'utf8');
const cspMetas = artifact.match(/<meta\s+http-equiv=["']Content-Security-Policy["']/gi) ?? [];
const heads = artifact.match(/<head\b/gi) ?? [];
if (cspMetas.length !== 0 || heads.length !== 1) {
  console.error(`PROBLEM: artifact contains ${cspMetas.length} CSP meta literal(s) and ${heads.length} <head literal(s); injectors would splice into the wrong place`);
  process.exit(1);
}

const config = createPajaRuntimeHostConfig({
  maxWaitMs: 2000,
  simulation: { relay: { mode: 'memory' }, storage: { mode: 'memory' } },
});
let html = renderPajaHtml(config);
const hostHasLock = /<meta[^>]*Content-Security-Policy[^>]*frame-src[^>]*'none'/i.test(html.slice(0, html.indexOf('</head>')));
if (HOST_FRAME_LOCK && !hostHasLock) html = html.replace(/<head>/i, `<head><meta http-equiv="Content-Security-Policy" content="frame-src 'none'">`);
console.log(`Paja host page frame-src lock: ${hostHasLock ? 'present (kehto/web#382)' : HOST_FRAME_LOCK ? 'emulated via LAB_HOST_FRAME_LOCK' : 'absent'}`);
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  if (path.startsWith('/__kehto/')) {
    try {
      res.setHeader('content-type', 'text/javascript; charset=utf-8');
      res.end(readFileSync(resolve(PAJA_DIST, path.slice('/__kehto/'.length))));
    } catch {
      res.statusCode = 404;
      res.end();
    }
    return;
  }
  res.setHeader('content-type', 'text/html');
  res.end(html);
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1800, height: 1100 } });
let exitCode = 0;
const problem = (message) => { exitCode = 1; console.error(`PROBLEM: ${message}`); };

try {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.setInputFiles('#runtime-local-file', DIST);

  const findLabFrame = async (timeoutMs) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      for (const frame of page.frames()) {
        if (frame === page.mainFrame()) continue;
        const found = await frame.evaluate(() => !!document.querySelector('[data-testid="security-lab"]')).catch(() => false);
        if (found) return frame;
      }
      await page.waitForTimeout(200);
    }
    return null;
  };
  const messageLog = () => page.evaluate(() => Array.from(document.querySelectorAll('#message-log [data-message-type]'))
    .map((entry) => `${entry.getAttribute('data-message-type')} ${(entry.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100)}`));

  const frame = await findLabFrame(20000);
  if (!frame) {
    problem('lab frame never appeared');
    console.error(await messageLog());
  } else {
    const start = Date.now();
    let busy = 1;
    while (Date.now() - start < 60000 && busy > 0) {
      busy = await frame.evaluate(() => document.querySelectorAll(
        '[data-testid="probe-row"]:not([data-level="destructive"])[data-status="running"], [data-testid="probe-row"]:not([data-level="destructive"])[data-status="pending"]',
      ).length).catch(() => -1);
      if (busy === -1) break;
      await page.waitForTimeout(250);
    }
    const rows = await frame.evaluate(() => Array.from(document.querySelectorAll('[data-testid="probe-row"]')).map((row) => ({
      id: row.getAttribute('data-probe-id'),
      status: row.getAttribute('data-status'),
      observed: row.querySelector('[data-col="observed"]')?.textContent?.trim(),
      evidence: row.querySelector('[data-col="evidence"]')?.textContent?.trim(),
    }))).catch(() => null);
    if (!rows) {
      problem('lab frame vanished during run all (was the lab revoked?)');
      console.error(await messageLog());
    } else {
      console.log(`\n=== Paja runtime-pointer (srcdoc): ${rows.length} rows ===`);
      for (const row of rows) console.log(`${row.status.padEnd(8)} ${row.id.padEnd(30)} ${row.observed} :: ${row.evidence}`);
      for (const row of rows.filter((candidate) => candidate.status === 'fail')) problem(`probe ${row.id} failed: ${row.evidence}`);
      const revokedEarly = (await messageLog()).filter((line) => line.includes('paja.napplet.revoked'));
      if (revokedEarly.length) problem(`Paja revoked the lab during run all: ${revokedEarly.join(' | ')}`);

      // Destructive probes: each one ends the session on a compliant shell, so
      // reload the host and the artifact before every id.
      for (const id of DESTRUCTIVE_IDS) {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        await page.setInputFiles('#runtime-local-file', DIST);
        const fresh = await findLabFrame(20000);
        if (!fresh) { problem(`lab frame did not come back before ${id}`); continue; }
        await fresh.waitForSelector(`[data-testid="run-probe-${id}"]`);
        await fresh.click(`[data-testid="run-probe-${id}"]`).catch(() => undefined);
        await page.waitForTimeout(2500);
        const alive = await findLabFrame(500);
        const revocations = (await messageLog()).filter((line) => line.includes('paja.napplet.revoked'));
        const bannerSeen = (await Promise.all(page.frames().map((frame) => frame.evaluate((text) => document.body?.textContent?.includes(text) ?? false, BANNER).catch(() => false)))).some(Boolean);
        console.log(`\ndestructive ${id}: frame alive=${!!alive}; banner=${bannerSeen}; revocations=${JSON.stringify(revocations)}`);
        if (alive) problem(`lab still alive after ${id}; the shell did not revoke`);
        if (bannerSeen) problem(`${id}: an unverified blob document is still rendering in the napplet frame`);
        if (!revocations.some((line) => /window-message|second-hello|second-load|port-closed/.test(line))) problem(`${id}: no NIP-5D revocation reason logged`);
      }
    }
  }
} finally {
  await browser.close();
  server.close();
}
console.log(exitCode === 0 ? '\nPAJA CHECK: OK' : '\nPAJA CHECK: FAILED');
process.exit(exitCode);
