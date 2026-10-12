import { afterEach, describe, expect, it } from 'vitest';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { writeBundleManifest } from '../manifest.js';
import type { ManifestPluginState } from '../types.js';
import type { OptimizationServices } from './pipeline.js';
import { OPTIMIZATION_TARGET_BYTES } from './pipeline.js';

const roots: string[] = [];

function state(outDir: string, root: string): ManifestPluginState {
  return {
    outDir,
    projectRoot: root,
    base: '/',
    artifactMode: 'single-file',
    resolvedSchema: null,
    resolvedSchemaSource: null,
    inferredRequires: new Set(['relay']),
    reportedRequirementWarnings: new Set(),
  };
}

function fixture(): { root: string; dist: string; payload: Buffer } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'napplet-optimizer-security-'));
  roots.push(root);
  const dist = path.join(root, 'dist');
  fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
  const payload = Buffer.alloc(OPTIMIZATION_TARGET_BYTES + 64, 82);
  fs.writeFileSync(path.join(dist, 'index.html'), '<html><head></head><body><script src="./assets/entry.js"></script></body></html>');
  fs.writeFileSync(path.join(dist, 'assets', 'entry.js'), 'fetch(__nappletAssetUrl("assets/payload.bin"));');
  fs.writeFileSync(path.join(dist, 'assets', 'payload.bin'), payload);
  return { root, dist, payload };
}

function services(payload: Buffer, fail = false): OptimizationServices {
  const sha256 = crypto.createHash('sha256').update(payload).digest('hex');
  return {
    authorize: async () => ({ token: 'redacted-test-token', expiresAt: Date.now() + 60_000 }),
    upload: async ({ bytes }) => {
      if (fail) throw new Error('safe upload failure');
      return { sha256, bytes: bytes.byteLength };
    },
    resourceBytes: async () => new Blob([payload]),
  };
}

afterEach(() => {
  while (roots.length > 0) fs.rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('large asset optimizer manifest security boundary', () => {
  it('emits one resource requirement only after a committed transaction and hashes the final index.html', async () => {
    const built = fixture();
    await writeBundleManifest(
      { nappletType: 'security', description: 'Packaged security fixture', artifactMode: 'single-file', requires: ['relay'], optional: ['resource', 'theme'] },
      state(built.dist, built.root),
      services(built.payload),
    );

    const html = fs.readFileSync(path.join(built.dist, 'index.html'), 'utf8');
    const manifest = JSON.parse(fs.readFileSync(path.join(built.dist, '.nip5a-manifest.json'), 'utf8')) as { artifactHash: string; tags: string[][] };
    expect(manifest.tags.filter((tag) => tag[0] === 'R')).toEqual([
      ['R', 'relay'],
      ['R', 'resource'],
    ]);
    expect(manifest.tags.filter((tag) => tag[0] === 'O')).toEqual([['O', 'theme']]);
    expect(html).toContain('name="napplet-requires" content="relay resource"');
    expect(manifest.tags.some((tag) => tag[0] === 'path' || tag[0] === 'requires')).toBe(false);
    expect(manifest.tags.flat().join(' ')).not.toContain('data-napplet-private-resource-table');
    expect(manifest.tags.flat().join(' ')).not.toContain('blossom:sha256:');
    expect(html).toContain('data-napplet-private-resource-table');
    expect(manifest.artifactHash).toBe(crypto.createHash('sha256').update(html).digest('hex'));
    expect(manifest.tags.filter((tag) => tag[0] === 'x')).toEqual([['x', manifest.artifactHash]]);
    expect(fs.existsSync(path.join(built.dist, 'assets', 'payload.bin'))).toBe(false);
  });

  it('rolls back the artifact and omits resource when upload evidence is incomplete', async () => {
    const built = fixture();
    await writeBundleManifest(
      { nappletType: 'security-failure', description: 'Packaged fallback fixture', artifactMode: 'single-file', requires: ['relay'] },
      state(built.dist, built.root),
      services(built.payload, true),
    );

    const manifest = JSON.parse(fs.readFileSync(path.join(built.dist, '.nip5a-manifest.json'), 'utf8')) as { tags: string[][] };
    expect(manifest.tags.filter((tag) => tag[0] === 'R')).toEqual([['R', 'relay']]);
    expect(fs.existsSync(path.join(built.dist, 'assets', 'payload.bin'))).toBe(false);
    expect(fs.readFileSync(path.join(built.dist, 'index.html'), 'utf8')).toContain('data:application/octet-stream;base64');
  });
});
