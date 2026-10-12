/** Disposable Kehto Paja preview for a local build. */
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { readFile, realpath } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { startPajaServer } from '@kehto/paja';
import { sendFile, setCors } from './static.js';

/**
 * Host a built artifact in Paja on ephemeral loopback ports.
 * @param artifact Exact index.html selected by deployment.
 * @returns Shell URL and an async cleanup handle for both servers.
 * @example const preview = await startScreenshotPreview('/project/dist/index.html');
 */
export async function startScreenshotPreview(artifact: string): Promise<{ url: string; close(): Promise<void> }> {
  const index = await realpath(artifact);
  const root = dirname(index);
  const html = await readFile(index);
  const server = createServer((request, response) => {
    setCors(response);
    void (async () => {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
      if (pathname === '/' || pathname === '/index.html') {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        response.end(html);
        return;
      }
      const file = await realpath(resolve(root, `.${pathname}`));
      if (!file.startsWith(`${root}${sep}`)) { response.writeHead(403).end(); return; }
      if (!await sendFile(response, file)) response.writeHead(404).end();
    })().catch(() => { if (!response.headersSent) response.writeHead(404); response.end(); });
  });
  await new Promise<void>((done, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { server.off('error', reject); done(); });
  });
  const closeTarget = () => new Promise<void>((done, reject) => {
    server.closeAllConnections();
    server.close((error) => error ? reject(error) : done());
  });
  try {
    const targetUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const paja = await startPajaServer({ options: {
      host: '127.0.0.1', port: 0, targetUrl,
    } });
    return { url: paja.url, close: async () => { try { await paja.close(); } finally { await closeTarget(); } } };
  } catch (error) {
    await closeTarget();
    throw error;
  }
}
