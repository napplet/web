import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { deployToBunny, localFiles } from '../src/deploy.ts';

const sum = (body: string) => createHash('sha256').update(body).digest('hex').toUpperCase();

function site() {
  const root = mkdtempSync(join(tmpdir(), 'arch-site-'));
  mkdirSync(join(root, 'archetypes', 'note'), { recursive: true });
  writeFileSync(join(root, 'index.html'), '<h1>home</h1>');
  writeFileSync(join(root, 'llms.txt'), 'llms');
  writeFileSync(join(root, 'archetypes', 'note', 'index.html'), '<h1>note</h1>');
  return root;
}

function fakeBunny(remote: Record<string, string>) {
  const calls: Array<{ method: string; url: string; headers: Record<string, string> }> = [];
  const fetchImpl = (async (input: string | URL, init: RequestInit = {}) => {
    const url = String(input);
    const method = init.method ?? 'GET';
    calls.push({ method, url, headers: init.headers as Record<string, string> });
    if (method === 'GET') {
      const prefix = url.replace('https://storage.example/zone/', '');
      const names = new Map<string, { dir: boolean; checksum?: string }>();
      for (const [path, body] of Object.entries(remote)) {
        if (!path.startsWith(prefix)) continue;
        const rest = path.slice(prefix.length);
        const [head, ...tail] = rest.split('/');
        names.set(head, tail.length ? { dir: true } : { dir: false, checksum: sum(body) });
      }
      return new Response(JSON.stringify([...names].map(([ObjectName, entry]) => ({ ObjectName, IsDirectory: entry.dir, Checksum: entry.checksum ?? null }))), { status: 200 });
    }
    return new Response('', { status: method === 'PUT' ? 201 : 200 });
  }) as typeof fetch;
  return { calls, fetchImpl };
}

const target = { storageZone: 'zone', storageEndpoint: 'storage.example', storagePassword: 'pw', pullZoneId: '7', apiKey: 'key', concurrency: 2, deleteStale: true };

describe('localFiles', () => {
  it('lists files with forward-slash paths and upper-case SHA-256', () => {
    const files = localFiles(site());
    expect([...files.keys()].sort()).toEqual(['archetypes/note/index.html', 'index.html', 'llms.txt']);
    expect(files.get('llms.txt')?.checksum).toBe(sum('llms'));
  });
});

describe('deployToBunny', () => {
  it('uploads changed files (pages last), skips unchanged, deletes stale files and purges', async () => {
    const bunny = fakeBunny({ 'llms.txt': 'llms', 'index.html': 'old', 'stale/page.html': 'x' });
    const result = await deployToBunny(site(), target, () => {}, bunny.fetchImpl);
    expect(result).toEqual({ uploaded: 2, skipped: 1, deleted: 1 });
    const puts = bunny.calls.filter(call => call.method === 'PUT').map(call => call.url.replace('https://storage.example/zone/', ''));
    expect(puts).toEqual(['archetypes/note/index.html', 'index.html']);
    expect(bunny.calls.find(call => call.method === 'PUT')?.headers).toMatchObject({ AccessKey: 'pw', 'Content-Type': 'text/html; charset=utf-8' });
    expect(bunny.calls.filter(call => call.method === 'DELETE').map(call => call.url)).toEqual(['https://storage.example/zone/stale/page.html']);
    expect(bunny.calls.at(-1)).toMatchObject({ method: 'POST', url: 'https://api.bunny.net/pullzone/7/purgeCache', headers: { AccessKey: 'key' } });
  });

  it('does nothing but list when the zone already matches', async () => {
    const bunny = fakeBunny({ 'llms.txt': 'llms', 'index.html': '<h1>home</h1>', 'archetypes/note/index.html': '<h1>note</h1>' });
    expect(await deployToBunny(site(), target, () => {}, bunny.fetchImpl)).toEqual({ uploaded: 0, skipped: 3, deleted: 0 });
    expect(bunny.calls.every(call => call.method === 'GET')).toBe(true);
  });

  it('refuses a build with no index.html and surfaces upload errors', async () => {
    await expect(deployToBunny(mkdtempSync(join(tmpdir(), 'empty-')), target, () => {}, fakeBunny({}).fetchImpl)).rejects.toThrow(/index.html/);
    const failing = (async (_url: string, init: RequestInit = {}) => (init.method === 'PUT' ? new Response('', { status: 401 }) : new Response('[]'))) as typeof fetch;
    await expect(deployToBunny(site(), target, () => {}, failing)).rejects.toThrow(/upload .* 401/);
  });
});
