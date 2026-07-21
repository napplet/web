/**
 * @napplet/conformance-cli -- The `--ui` watch server.
 *
 * Serves the standalone conformance web app (bundled with the CLI), the napplet
 * under test (same origin, with permissive CORS for the sandboxed iframe), and a
 * Server-Sent-Events stream. It watches the napplet's served directory and pushes
 * a `rerun` event on every change, so the open app re-runs conformance live — the
 * `vitest --ui` model: edit, save, see the verdict update.
 *
 * @packageDocumentation
 */

import { createServer, type Server, type ServerResponse } from 'node:http';
import { watch, type FSWatcher } from 'node:fs';
import { join, normalize, resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import { setCors, sendFile } from './static.js';

/** Path the app under `?live=1` is served the napplet from. */
const NAPPLET_PREFIX = '/__napplet__/';
/** SSE endpoint the live app subscribes to. */
const EVENTS_ROUTE = '/__conformance__/events';

/** Options for {@link startUiServer}. */
export interface UiServerOptions {
  /** Directory of the built conformance web app (served at `/`). */
  appDir: string;
  /** Directory of the built napplet under test (served at `/__napplet__/`). */
  nappletDir: string;
  /** Preferred port (0 = random). */
  port?: number;
  /** Debounce window (ms) for coalescing file-change bursts. Default 120. */
  debounceMs?: number;
}

/** A running `--ui` server. */
export interface UiServer {
  /** Base origin, e.g. `http://127.0.0.1:5219`. */
  origin: string;
  /** The app URL to open (already pointed at the napplet, live mode on). */
  appUrl: string;
  /** Force a `rerun` broadcast (used for the manual/initial trigger). */
  notify(): void;
  /** Shut the server + watcher down. */
  close(): Promise<void>;
}

function safeJoin(dir: string, urlPath: string): string | null {
  const relative = normalize(urlPath).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
  const full = join(dir, relative);
  return full.startsWith(dir) ? full : null;
}

/** Register an SSE subscriber and keep the connection open. */
function handleSse(res: ServerResponse, clients: Set<ServerResponse>): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  res.write('retry: 1000\n\n');
  clients.add(res);
  res.on('close', () => clients.delete(res));
}

/** Serve a file under `/__napplet__/`. */
async function handleNapplet(res: ServerResponse, nappletDir: string, path: string): Promise<void> {
  const rel = path.slice(NAPPLET_PREFIX.length) || 'index.html';
  const abs = safeJoin(nappletDir, rel);
  if (abs && (await sendFile(res, abs))) return;
  res.writeHead(404).end('napplet asset not found');
}

/** Serve the conformance web app, with an SPA fallback to its index. */
async function handleApp(res: ServerResponse, appDir: string, path: string): Promise<void> {
  const abs = safeJoin(appDir, path === '/' ? 'index.html' : path);
  if (abs && (await sendFile(res, abs))) return;
  if (await sendFile(res, join(appDir, 'index.html'))) return;
  res.writeHead(404).end('not found');
}

/** Watch a directory (recursively when supported) and call `fire` debounced. */
function startWatcher(dir: string, debounceMs: number, fire: () => void): { close(): void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const onEvent = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fire, debounceMs);
  };
  let watcher: FSWatcher;
  try {
    watcher = watch(dir, { recursive: true }, onEvent);
  } catch {
    // Recursive watch may be unsupported on some platforms.
    watcher = watch(dir, onEvent);
  }
  return {
    close() {
      if (timer) clearTimeout(timer);
      watcher.close();
    },
  };
}

/** Start the `--ui` watch server. */
export async function startUiServer(options: UiServerOptions): Promise<UiServer> {
  const appDir = resolve(options.appDir);
  const nappletDir = resolve(options.nappletDir);
  const clients = new Set<ServerResponse>();
  const broadcast = (): void => {
    for (const res of clients) res.write(`event: rerun\ndata: ${Date.now()}\n\n`);
  };

  const server: Server = createServer((req, res) => {
    setCors(res);
    res.setHeader('Cache-Control', 'no-store'); // never serve stale napplet code
    const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
    if (path === EVENTS_ROUTE) {
      handleSse(res, clients);
    } else if (path === NAPPLET_PREFIX.slice(0, -1) || path.startsWith(NAPPLET_PREFIX)) {
      void handleNapplet(res, nappletDir, path);
    } else {
      void handleApp(res, appDir, path);
    }
  });

  await new Promise<void>((r) => server.listen(options.port ?? 0, '127.0.0.1', r));
  const { port } = server.address() as AddressInfo;
  const origin = `http://127.0.0.1:${port}`;
  const appUrl = `${origin}/?url=${encodeURIComponent(NAPPLET_PREFIX)}&live=1`;
  const watcher = startWatcher(nappletDir, options.debounceMs ?? 120, broadcast);

  return {
    origin,
    appUrl,
    notify: broadcast,
    close: () =>
      new Promise<void>((res, rej) => {
        watcher.close();
        for (const c of clients) c.end();
        clients.clear();
        server.close((err) => (err ? rej(err) : res()));
      }),
  };
}
