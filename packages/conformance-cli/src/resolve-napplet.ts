/**
 * @napplet/conformance-cli -- Resolve which local artifact to conformance-test.
 *
 * Kept in its own module (not `cli.ts`, whose top level runs `main()`) so tests
 * can import the resolver without launching the CLI.
 */

import { stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

async function isFile(path: string): Promise<boolean> {
  return (await stat(path).catch(() => null))?.isFile() ?? false;
}

/**
 * Resolve the directory + index.html for a local napplet target.
 *
 * A built napplet is the artifact we test, so `dist/index.html` is preferred over
 * a sibling `index.html`. When `target` is a project root, its source
 * `index.html` (a Vite entry referencing `/src/*.ts` that cannot run in the
 * opaque-origin `srcdoc` sandbox) would otherwise shadow the built single-file
 * output and make conformance test the wrong, never-booting artifact.
 */
export async function resolveNappletDir(target: string): Promise<{ dir: string; indexHtml: string }> {
  const base = resolve(target);
  const dist = join(base, 'dist');
  if (await isFile(join(dist, 'index.html'))) return { dir: dist, indexHtml: join(dist, 'index.html') };
  if (await isFile(join(base, 'index.html'))) return { dir: base, indexHtml: join(base, 'index.html') };
  throw new Error(`No index.html found in ${join(dist, 'index.html')} or ${join(base, 'index.html')}. Build the napplet first.`);
}
