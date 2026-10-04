/** Filesystem traversal and artifact hashing. */

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

