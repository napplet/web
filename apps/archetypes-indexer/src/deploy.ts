// ─── Bunny Storage deploy ───────────────────────────────────────────────────
// Upload changed files, delete files the new build no longer has, purge the
// pull zone. Unchanged files are skipped by comparing SHA-256 checksums.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep, extname } from 'node:path';
import { pool, type Log } from './crawl.ts';

export interface BunnyTarget {
  storageZone: string;
  storageEndpoint: string;
  storagePassword: string;
  pullZoneId?: string;
  apiKey?: string;
  concurrency: number;
  deleteStale: boolean;
}

interface RemoteEntry { path: string; checksum?: string }

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2',
};

/**
 * Walk a directory into storage paths (forward slashes) and SHA-256 checksums.
 * @param root Build output directory.
 * @returns Storage path → { file, checksum }.
 * @example localFiles('./dist')
 */
export function localFiles(root: string): Map<string, { file: string; checksum: string }> {
  const out = new Map<string, { file: string; checksum: string }>();
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const file = join(dir, name);
      if (statSync(file).isDirectory()) walk(file);
      else out.set(relative(root, file).split(sep).join('/'), { file, checksum: createHash('sha256').update(readFileSync(file)).digest('hex').toUpperCase() });
    }
  };
  walk(root);
  return out;
}

/**
 * List every file in the storage zone.
 * @param target Bunny target.
 * @param fetchImpl Injected fetch.
 * @returns Remote files with checksums.
 * @example await remoteFiles(target, fetch)
 */
export async function remoteFiles(target: BunnyTarget, fetchImpl: typeof fetch): Promise<RemoteEntry[]> {
  const out: RemoteEntry[] = [];
  const walk = async (prefix: string) => {
    const response = await fetchImpl(`https://${target.storageEndpoint}/${target.storageZone}/${prefix}`, { headers: { AccessKey: target.storagePassword, Accept: 'application/json' } });
    if (response.status === 404) return;
    if (!response.ok) throw new Error(`Bunny list ${prefix || '/'} failed: ${response.status}`);
    const entries = await response.json() as Array<{ ObjectName: string; IsDirectory: boolean; Checksum?: string | null }>;
    for (const entry of entries) {
      const path = `${prefix}${entry.ObjectName}`;
      if (entry.IsDirectory) await walk(`${path}/`);
      else out.push({ path, ...(entry.Checksum ? { checksum: entry.Checksum.toUpperCase() } : {}) });
    }
  };
  await walk('');
  return out;
}

/**
 * Make the storage zone match a local build directory and purge the CDN.
 * @param root Build output directory.
 * @param target Bunny target and credentials.
 * @param log Logger.
 * @param fetchImpl Injected fetch.
 * @returns Counts of uploaded, skipped and deleted files.
 * @example await deployToBunny('./dist', target, log)
 */
export async function deployToBunny(root: string, target: BunnyTarget, log: Log, fetchImpl: typeof fetch = fetch): Promise<{ uploaded: number; skipped: number; deleted: number }> {
  const local = localFiles(root);
  if (!local.has('index.html')) throw new Error('Refusing to deploy a build without index.html');
  const remote = await remoteFiles(target, fetchImpl);
  const remoteSums = new Map(remote.map(entry => [entry.path, entry.checksum]));
  const uploads = [...local].filter(([path, { checksum }]) => remoteSums.get(path) !== checksum);
  // HTML last, so pages never reference assets that are not there yet.
  uploads.sort(([a], [b]) => Number(a.endsWith('.html')) - Number(b.endsWith('.html')) || a.localeCompare(b));
  const assets = uploads.filter(([path]) => !path.endsWith('.html'));
  const pages = uploads.filter(([path]) => path.endsWith('.html'));
  const put = async ([path, { file, checksum }]: [string, { file: string; checksum: string }]) => {
    const response = await fetchImpl(`https://${target.storageEndpoint}/${target.storageZone}/${path}`, {
      method: 'PUT',
      headers: { AccessKey: target.storagePassword, Checksum: checksum, 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream' },
      body: readFileSync(file),
    });
    if (!response.ok) throw new Error(`Bunny upload ${path} failed: ${response.status}`);
  };
  await pool(assets, target.concurrency, put);
  await pool(pages, target.concurrency, put);
  let deleted = 0;
  if (target.deleteStale) {
    const stale = remote.filter(entry => !local.has(entry.path));
    await pool(stale, target.concurrency, async entry => {
      const response = await fetchImpl(`https://${target.storageEndpoint}/${target.storageZone}/${entry.path}`, { method: 'DELETE', headers: { AccessKey: target.storagePassword } });
      if (!response.ok && response.status !== 404) throw new Error(`Bunny delete ${entry.path} failed: ${response.status}`);
    });
    deleted = stale.length;
  }
  if (target.pullZoneId && target.apiKey && (uploads.length || deleted)) {
    const response = await fetchImpl(`https://api.bunny.net/pullzone/${encodeURIComponent(target.pullZoneId)}/purgeCache`, { method: 'POST', headers: { AccessKey: target.apiKey } });
    if (!response.ok) throw new Error(`Bunny purge failed: ${response.status}`);
  }
  const result = { uploaded: uploads.length, skipped: local.size - uploads.length, deleted };
  log('deploy', result);
  return result;
}
