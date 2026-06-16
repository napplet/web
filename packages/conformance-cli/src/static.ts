/**
 * @napplet/conformance-cli -- Shared static-serving helpers used by both the
 * one-shot harness server and the `--ui` watch server.
 *
 * @packageDocumentation
 */

import { readFile, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import type { ServerResponse } from 'node:http';

/** Content types by extension. */
export const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/** The napplet iframe runs at an opaque origin; allow its module subresources. */
export function setCors(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
}

/** Send a file if it exists; return false (without writing) when it does not. */
export async function sendFile(res: ServerResponse, absPath: string): Promise<boolean> {
  const info = await stat(absPath).catch(() => null);
  if (!info?.isFile()) return false;
  res.writeHead(200, { 'Content-Type': MIME[extname(absPath).toLowerCase()] ?? 'application/octet-stream' });
  res.end(await readFile(absPath));
  return true;
}
