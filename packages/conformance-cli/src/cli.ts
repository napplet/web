/**
 * @napplet/conformance-cli -- `napplet-conformance` entry point.
 *
 * Runs the @napplet/conformance engine against a napplet in real headless Chromium:
 *
 *  1. Resolve the napplet's built directory (or a remote `--url`).
 *  2. Serve it on loopback alongside a host harness page + the engine bundle.
 *  3. Drive Playwright Chromium to `bootAndCollect` inside the host page.
 *  4. Assemble a ConformanceContext on the node side (manifest HTML + static scan),
 *     run the check catalog, print the chosen report, and set the exit code.
 *
 * Exit codes: `0` conformant, `1` non-conformant, `2` usage/runtime error.
 *
 * @packageDocumentation
 */

import { readFile, writeFile, stat } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import {
  buildContext,
  runConformance,
  report,
  type BootCollection,
  type ReporterFormat,
} from '@napplet/conformance';
import { startHarnessServer } from './server.js';
import { startUiServer } from './ui-server.js';
import { scanForbiddenGlobals } from './scan.js';

interface CliOptions {
  target?: string;
  url?: string;
  reporter: ReporterFormat;
  out?: string;
  readyTimeoutMs: number;
  settleMs: number;
  runDegraded: boolean;
  allowSameOrigin: boolean;
  ui: boolean;
  port?: number;
  open: boolean;
  exec?: string;
  help: boolean;
}

const HELP = `napplet-conformance — run NAP protocol conformance against a napplet

Usage:
  napplet-conformance [dir] [options]            # headless, one-shot, CI exit code
  napplet-conformance --ui [dir] [options]       # open the live web runtime (like vitest --ui)
  napplet-conformance --url https://my.napplet/ [options]

Arguments:
  dir                      Built napplet directory (looks for ./index.html or ./dist/index.html)

Options:
  --url <url>              Test a remotely-served napplet instead of a local dir (headless)
  --reporter <fmt>         pretty | json | junit            (default: pretty)
  --out <file>             Write the report to a file instead of stdout
  --ready-timeout <ms>     Boot timeout waiting for shell.ready (default: 5000)
  --settle <ms>            Envelope-collection window after boot (default: 600)
  --no-degraded            Skip the no-capability graceful-degradation pass
  --allow-same-origin      Debug: also grant allow-same-origin (a conformant napplet must not need it)

UI / watch mode (--ui):
  --port <n>               Port for the UI server (default: random)
  --no-open                Do not open a browser automatically
  --exec <cmd>             Run a command (e.g. "vite build --watch") so edits rebuild the served dir;
                           the watcher then re-runs conformance live on every change
  -h, --help               Show this help

Exit codes (headless): 0 conformant, 1 non-conformant, 2 usage/runtime error.
`;

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    reporter: 'pretty',
    readyTimeoutMs: 5000,
    settleMs: 600,
    runDegraded: true,
    allowSameOrigin: false,
    ui: false,
    open: true,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = (): string => {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      i += 1;
      return v;
    };
    switch (arg) {
      case '-h':
      case '--help':
        opts.help = true;
        break;
      case '--url':
        opts.url = value();
        break;
      case '--reporter': {
        const r = value();
        if (r !== 'pretty' && r !== 'json' && r !== 'junit') throw new Error(`Invalid reporter: ${r}`);
        opts.reporter = r;
        break;
      }
      case '--out':
        opts.out = value();
        break;
      case '--ready-timeout':
        opts.readyTimeoutMs = Number(value());
        break;
      case '--settle':
        opts.settleMs = Number(value());
        break;
      case '--no-degraded':
        opts.runDegraded = false;
        break;
      case '--allow-same-origin':
        opts.allowSameOrigin = true;
        break;
      case '--ui':
        opts.ui = true;
        break;
      case '--port':
        opts.port = Number(value());
        break;
      case '--no-open':
        opts.open = false;
        break;
      case '--exec':
        opts.exec = value();
        break;
      default:
        if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}`);
        if (opts.target) throw new Error(`Unexpected extra argument: ${arg}`);
        opts.target = arg;
    }
  }
  return opts;
}

async function isFile(path: string): Promise<boolean> {
  return (await stat(path).catch(() => null))?.isFile() ?? false;
}

/** Resolve the directory + index.html for a local napplet target. */
async function resolveNappletDir(target: string): Promise<{ dir: string; indexHtml: string }> {
  const base = resolve(target);
  if (await isFile(join(base, 'index.html'))) return { dir: base, indexHtml: join(base, 'index.html') };
  const dist = join(base, 'dist');
  if (await isFile(join(dist, 'index.html'))) return { dir: dist, indexHtml: join(dist, 'index.html') };
  throw new Error(`No index.html found in ${base} or ${dist}. Build the napplet first.`);
}

async function collectBoot(hostUrl: string, allowSameOrigin: boolean, totalTimeoutMs: number): Promise<BootCollection> {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    page.on('pageerror', (e) => process.stderr.write(`[host page error] ${e.message}\n`));
    await page.goto(hostUrl, { waitUntil: 'load' });
    await page.waitForFunction(
      () => window.__conformanceBoot__ !== undefined || window.__conformanceError__ !== undefined,
      undefined,
      { timeout: totalTimeoutMs },
    );
    const error = await page.evaluate(() => window.__conformanceError__);
    if (error) throw new Error(`Host harness failed: ${error}`);
    const boot = await page.evaluate(() => window.__conformanceBoot__);
    if (!boot) throw new Error('Host harness produced no result');
    void allowSameOrigin;
    return boot;
  } finally {
    await browser.close();
  }
}

async function isDir(path: string): Promise<boolean> {
  return (await stat(path).catch(() => null))?.isDirectory() ?? false;
}

/** Best-effort: open a URL in the default browser. */
function openBrowser(url: string): void {
  try {
    if (process.platform === 'darwin') {
      spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
    } else if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
    } else {
      spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
    }
  } catch {
    /* best-effort — the URL is printed regardless */
  }
}

/** `--ui`: serve the live web runtime + the napplet, watch, and re-run on change. */
async function runUiMode(opts: CliOptions): Promise<number> {
  if (opts.url) {
    process.stderr.write('--ui serves a local napplet directory; --url is not supported in UI mode.\n');
    return 2;
  }
  if (!opts.target) {
    process.stderr.write(`Provide a napplet directory.\n\n${HELP}`);
    return 2;
  }
  const resolved = await resolveNappletDir(opts.target);
  const here = dirname(fileURLToPath(import.meta.url));
  const appDir = join(here, 'ui');
  if (!(await isDir(appDir))) {
    process.stderr.write(`Conformance UI assets are missing at ${appDir}. Rebuild @napplet/conformance-cli.\n`);
    return 2;
  }

  const server = await startUiServer({ appDir, nappletDir: resolved.dir, port: opts.port });

  const child = opts.exec ? spawn(opts.exec, { cwd: resolve(opts.target), shell: true, stdio: 'inherit' }) : null;

  process.stdout.write(
    `\n  napplet conformance UI  →  ${server.appUrl}\n` +
      `  watching  ${resolved.dir}${opts.exec ? `  (running: ${opts.exec})` : ''}\n` +
      `  Ctrl-C to stop\n\n`,
  );
  if (opts.open) openBrowser(server.appUrl);

  await new Promise<void>((resolveWait) => {
    let closing = false;
    const shutdown = (): void => {
      if (closing) return;
      closing = true;
      child?.kill();
      void server.close().finally(resolveWait);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });
  return 0;
}

async function main(argv: string[]): Promise<number> {
  let opts: CliOptions;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n\n${HELP}`);
    return 2;
  }
  if (opts.help) {
    process.stdout.write(HELP);
    return 0;
  }

  if (opts.ui) {
    return runUiMode(opts);
  }

  // Resolve the subject: local dir or remote URL.
  let nappletDir: string | null = null;
  let manifestHtml: string;
  let forbiddenGlobals: string[] = [];
  let bootUrl: string;

  if (opts.url) {
    bootUrl = opts.url;
    manifestHtml = await (await fetch(opts.url)).text();
  } else {
    if (!opts.target) {
      process.stderr.write(`Provide a napplet directory or --url.\n\n${HELP}`);
      return 2;
    }
    const resolved = await resolveNappletDir(opts.target);
    nappletDir = resolved.dir;
    manifestHtml = await readFile(resolved.indexHtml, 'utf8');
    forbiddenGlobals = await scanForbiddenGlobals(resolved.dir);
    bootUrl = '/';
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const hostBundle = await readFile(join(here, 'host-bundle.global.js'), 'utf8');

  const server = await startHarnessServer({
    nappletDir,
    hostBundle,
    bootConfig: {
      url: bootUrl,
      readyTimeoutMs: opts.readyTimeoutMs,
      settleMs: opts.settleMs,
      runDegraded: opts.runDegraded,
    },
  });

  let boot: BootCollection;
  try {
    // Generous overall budget: two boots (primary + degraded), each up to
    // readyTimeout + settle, plus browser startup.
    const totalTimeout = (opts.readyTimeoutMs + opts.settleMs) * 2 + 30000;
    boot = await collectBoot(server.hostUrl, opts.allowSameOrigin, totalTimeout);
  } finally {
    await server.close();
  }

  const context = buildContext({ manifestHtml, boot, forbiddenGlobals });
  const run = runConformance(context);
  const output = report(run, opts.reporter);

  if (opts.out) {
    await writeFile(opts.out, `${output}\n`, 'utf8');
    process.stdout.write(`Report written to ${opts.out}\n`);
  } else {
    process.stdout.write(`${output}\n`);
  }

  return run.ok ? 0 : 1;
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err: unknown) => {
    process.stderr.write(`napplet-conformance: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
    process.exitCode = 2;
  });
