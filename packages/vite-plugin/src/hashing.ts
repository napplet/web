/**
 * @napplet/vite-plugin — filesystem walking and SHA-256 hashing primitives.
 *
 * Pure helpers used by the manifest builder to enumerate dist artifacts and
 * compute per-file and aggregate hashes for the NIP-5A `x` tag projection.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/** Walk a directory recursively and return all file paths (relative to root). */
export function walkDir(dir: string, root?: string): string[] {
  root = root ?? dir;
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, root));
    } else {
      results.push(path.relative(root, fullPath));
    }
  }
  return results;
}

/** Compute SHA-256 hash of a file's contents. */
export function sha256File(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

/** Compute aggregate hash from [sha256hex, relativePath] pairs. */
export function computeAggregateHash(xTags: Array<[string, string]>): string {
  const lines = xTags.map(([hash, p]) => `${hash} ${p}\n`);
  lines.sort();
  const concatenated = lines.join('');
  return crypto.createHash('sha256').update(concatenated).digest('hex');
}
