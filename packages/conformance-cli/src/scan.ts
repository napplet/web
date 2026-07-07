/**
 * @napplet/conformance-cli -- Static scan for forbidden napplet authority.
 *
 * A napplet runs in a `sandbox="allow-scripts"` iframe at an opaque origin, so the
 * host cannot observe every forbidden browser surface at runtime. Instead we scan
 * served source for references to authority the shell owns: signer globals,
 * browser storage, direct network primitives, and external network-loaded assets.
 * This is a heuristic, but a true positive is meaningful: NIP-5D and the NAPs
 * route these capabilities through `window.napplet` domains.
 *
 * @packageDocumentation
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

/** Patterns considered forbidden, keyed by the label reported in the verdict. */
const FORBIDDEN: Array<{ label: string; re: RegExp }> = [
  { label: 'window.nostr', re: /\bwindow\s*\.\s*nostr\b/ },
  { label: 'globalThis.nostr', re: /\bglobalThis\s*\.\s*nostr\b/ },
  { label: 'fetch', re: /\b(?:window\s*\.\s*|globalThis\s*\.\s*)?fetch\s*\(/ },
  { label: 'XMLHttpRequest', re: /\b(?:new\s+)?XMLHttpRequest\s*\(/ },
  { label: 'WebSocket', re: /\b(?:new\s+)?WebSocket\s*\(/ },
  { label: 'localStorage', re: /\b(?:window\s*\.\s*)?localStorage\b/ },
  { label: 'sessionStorage', re: /\b(?:window\s*\.\s*)?sessionStorage\b/ },
  { label: 'indexedDB', re: /\b(?:window\s*\.\s*)?indexedDB\b/ },
  { label: 'document.cookie', re: /\bdocument\s*\.\s*cookie\b/ },
  { label: 'external img src', re: /<img\b[^>]*\bsrc\s*=\s*["']?https?:/i },
  { label: 'external script src', re: /<script\b[^>]*\bsrc\s*=\s*["']?https?:/i },
  { label: 'external stylesheet href', re: /<link\b[^>]*\brel\s*=\s*["']?stylesheet["']?[^>]*\bhref\s*=\s*["']?https?:/i },
  { label: 'external stylesheet href', re: /<link\b[^>]*\bhref\s*=\s*["']?https?:[^>]*\brel\s*=\s*["']?stylesheet["']?/i },
];

const SCANNABLE = new Set(['.js', '.mjs', '.cjs', '.html', '.htm']);
const SKIP_DIRS = new Set(['node_modules', '.git', '.turbo', 'coverage']);

async function collectFiles(dir: string, acc: string[]): Promise<void> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await collectFiles(join(dir, entry.name), acc);
    } else if (entry.isFile() && SCANNABLE.has(extname(entry.name).toLowerCase())) {
      acc.push(join(dir, entry.name));
    }
  }
}

/**
 * Scan a napplet directory for forbidden browser authority references.
 *
 * @param dir - The directory of served napplet files.
 * @returns The distinct forbidden labels found (e.g. `['window.nostr']`).
 */
export async function scanForbiddenGlobals(dir: string): Promise<string[]> {
  const info = await stat(dir).catch(() => null);
  if (!info?.isDirectory()) return [];
  const files: string[] = [];
  await collectFiles(dir, files);
  const found = new Set<string>();
  for (const file of files) {
    const text = await readFile(file, 'utf8').catch(() => '');
    for (const { label, re } of FORBIDDEN) {
      if (re.test(text)) found.add(label);
    }
  }
  return [...found];
}
