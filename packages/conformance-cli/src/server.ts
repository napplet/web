/**
 * @napplet/conformance-cli -- Loopback harness server.
 *
 * Serves the napplet's files plus two reserved harness routes (the host page and
 * the browser bundle). Every response carries `Access-Control-Allow-Origin: *`:
 * the napplet iframe runs at an opaque origin (sandbox without `allow-same-origin`),
 * so its `<script type="module">` subresources are fetched in CORS mode and would
 * otherwise be blocked.
 *
 * @packageDocumentation
 */

import { createServer, type Server, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname, resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import { MIME } from './static.js';

/** The napplet URL + timing knobs the host page passes to `bootAndCollect`. */
export interface BootConfig {
  url: string;
  readyTimeoutMs: number;
  settleMs: number;
  runDegraded: boolean;
}

/** Options for {@link startHarnessServer}. */
export interface HarnessServerOptions {
  /** Directory of napplet files to serve, or `null` in remote-URL mode. */
  nappletDir: string | null;
  /** JavaScript source of the host browser bundle. */
  hostBundle: string;
  /** Boot configuration injected into the host page. */
  bootConfig: BootConfig;
}

/** A running harness server. */
export interface HarnessServer {
  /** Base origin, e.g. `http://127.0.0.1:54213`. */
  origin: string;
  /** URL of the host harness page. */
  hostUrl: string;
  /** Shut the server down. */
  close(): Promise<void>;
}

const HOST_HTML_ROUTE = '/__conformance__/host.html';
const HOST_BUNDLE_ROUTE = '/__conformance__/host-bundle.js';

function renderHostPage(boot: BootConfig): string {
  // The inline script lives on the harness page (full privilege, our origin), not
  // in the sandboxed napplet — so it is not subject to the napplet CSP.
  const cfg = JSON.stringify(boot);
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>napplet conformance host</title></head>
<body>
<script src="${HOST_BUNDLE_ROUTE}"></script>
<script>
  (function () {
    var cfg = ${cfg};
    window.NappletConformanceHost.run(cfg).then(function (boot) {
      window.__conformanceBoot__ = boot;
    }).catch(function (err) {
      window.__conformanceError__ = String((err && err.stack) || err);
    });
  })();
</script>
</body>
</html>`;
}

/** Start the loopback harness server on a random port. */
export async function startHarnessServer(options: HarnessServerOptions): Promise<HarnessServer> {
  const dir = options.nappletDir ? resolve(options.nappletDir) : null;
  const hostHtml = renderHostPage(options.bootConfig);

  const server: Server = createServer((req, res) => {
    void serve(req.url ?? '/', res);
  });

  async function serve(rawUrl: string, res: ServerResponse): Promise<void> {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const path = decodeURIComponent(rawUrl.split('?')[0]);

    if (path === HOST_HTML_ROUTE) {
      res.writeHead(200, { 'Content-Type': MIME['.html'] });
      res.end(hostHtml);
      return;
    }
    if (path === HOST_BUNDLE_ROUTE) {
      res.writeHead(200, { 'Content-Type': MIME['.js'] });
      res.end(options.hostBundle);
      return;
    }

    if (!dir) {
      res.writeHead(404).end('not found');
      return;
    }

    // Resolve a safe path under the napplet dir.
    const relative = normalize(path).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
    let filePath = join(dir, relative);
    if (!filePath.startsWith(dir)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    try {
      let info = await stat(filePath).catch(() => null);
      if (info?.isDirectory()) {
        filePath = join(filePath, 'index.html');
        info = await stat(filePath).catch(() => null);
      }
      if (path === '/' && !info) {
        filePath = join(dir, 'index.html');
        info = await stat(filePath).catch(() => null);
      }
      if (!info?.isFile()) {
        res.writeHead(404).end('not found');
        return;
      }
      const body = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(500).end('server error');
    }
  }

  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const address = server.address() as AddressInfo;
  const origin = `http://127.0.0.1:${address.port}`;

  return {
    origin,
    hostUrl: `${origin}${HOST_HTML_ROUTE}`,
    close: () => new Promise<void>((res, rej) => server.close((err) => (err ? rej(err) : res()))),
  };
}
