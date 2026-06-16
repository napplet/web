/**
 * @napplet/conformance-cli -- Static scan for forbidden globals.
 *
 * A napplet runs in a `sandbox="allow-scripts"` iframe at an opaque origin, so the
 * host cannot observe `window.nostr` access at runtime. Instead we scan the served
 * source for references to globals a shell never provides. This is a heuristic, but
 * a true positive is meaningful: shells removed `window.nostr` from napplets in
 * v0.24.0, so any reference is dead or broken code.
 *
 * @packageDocumentation
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

/** Patterns considered forbidden, keyed by the label reported in the verdict. */
const FORBIDDEN: Array<{ label: string; re: RegExp }> = [
  { label: 'window.nostr', re: /\bwindow\s*\.\s*nostr\b/ },
  { label: 'globalThis.nostr', re: /\bglobalThis\s*\.\s*nostr\b/ },
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
 * Scan a napplet directory for forbidden global references.
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
