/**
 * @napplet/vite-plugin — filesystem walking and SHA-256 hashing primitives.
 *
 * Pure helpers used by the manifest builder to enumerate dist artifacts and
 * compute per-file SHA-256 hashes and the NIP-5A aggregate hash carried in the
 * manifest `x` tag.
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

/**
 * Compute the NIP-5A aggregate hash from `[sha256hex, absolutePath]` pairs.
 *
 * Per NIP-5A §Aggregate Hash: each pair becomes a `"<sha256> <absolute-path>\n"`
 * line, the lines are sorted ascending lexicographically, concatenated as UTF-8,
 * and SHA-256'd to lowercase hex. The input MUST be `path`-tag pairs only —
 * absolute paths (leading `/`), no other manifest tags or event fields.
 */
export function computeAggregateHash(pathTags: Array<[string, string]>): string {
  const lines = pathTags.map(([hash, p]) => `${hash} ${p}\n`);
  lines.sort();
  const concatenated = lines.join('');
  return crypto.createHash('sha256').update(concatenated).digest('hex');
}
