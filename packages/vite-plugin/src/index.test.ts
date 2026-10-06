import { afterEach, describe, expect, it, vi } from 'vitest';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { IndexHtmlTransformResult } from 'vite';
import { nip5aManifest, NAPPLET_KIND_NAMED, type Nip5aManifestOptions } from './index';

const TEST_PRIVKEY = '01'.repeat(32);
const tempRoots: string[] = [];

function sha256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function makeFixture(): { root: string; dist: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nip5a-plugin-'));
  tempRoots.push(root);
  const dist = path.join(root, 'dist');
  fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
  return { root, dist };
}

async function runCloseBundle(
  options: Nip5aManifestOptions,
  fixture: { root: string; dist: string },
  viteConfig: Record<string, unknown> = {},
  sources: Array<{ id: string; code: string }> = [],
  signingKey: string | null = TEST_PRIVKEY,
): Promise<{ warnings: string[] }> {
  const previousPrivkey = process.env.VITE_DEV_PRIVKEY_HEX;
  if (signingKey === null) {
    delete process.env.VITE_DEV_PRIVKEY_HEX;
  } else {
    process.env.VITE_DEV_PRIVKEY_HEX = signingKey;
  }
  const warnings: string[] = [];
  try {
    const plugin = nip5aManifest({ description: 'A test napplet', ...options });
    await (plugin.configResolved as (config: unknown) => unknown)?.({
      ...viteConfig,
      root: fixture.root,
      build: { outDir: fixture.dist },
    });
    if (typeof plugin.transform === 'function') {
      const context = {
        warn(message: string) {
          warnings.push(message);
        },
      };
      for (const source of sources) {
        await plugin.transform.call(context as never, source.code, source.id);
      }
    }
    await (plugin.closeBundle as () => unknown)?.();
    return { warnings };
  } finally {
    if (previousPrivkey === undefined) {
      delete process.env.VITE_DEV_PRIVKEY_HEX;
    } else {
      process.env.VITE_DEV_PRIVKEY_HEX = previousPrivkey;
    }
  }
}

function readManifest(dist: string): { kind: number; artifactHash: string; tags: string[][] } {
  return JSON.parse(
    fs.readFileSync(path.join(dist, '.nip5a-manifest.json'), 'utf-8'),
  ) as { kind: number; artifactHash: string; tags: string[][] };
}

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.VITE_DEV_PRIVKEY_HEX;
  while (tempRoots.length > 0) {
    fs.rmSync(tempRoots.pop()!, { recursive: true, force: true });
  }
});

describe('nip5aManifest artifact modes', () => {
  it('writes unsigned requires and archetype metadata when no development key is set', async () => {
    const fixture = makeFixture();
    fs.writeFileSync(path.join(fixture.dist, 'index.html'), '<!doctype html>');

    await runCloseBundle(
      {
        nappletType: 'unsigned-metadata',
        requires: ['outbox', 'count'],
        archetypes: [{ slug: 'note', convention: 'napplet:note/open' }],
      },
      fixture,
      {},
      [],
      null,
    );

    const manifest = JSON.parse(
      fs.readFileSync(path.join(fixture.dist, '.nip5a-manifest.json'), 'utf-8'),
    ) as Record<string, unknown> & { tags: string[][] };
    expect(manifest.tags.filter((tag) => tag[0] === 'R')).toEqual([
      ['R', 'count'],
      ['R', 'outbox'],
    ]);
    expect(manifest.tags).toContainEqual(['z', 'note']);
    expect(manifest.tags).toContainEqual(['i', 'napplet:note/open']);
    expect(manifest).not.toHaveProperty('id');
    expect(manifest).not.toHaveProperty('sig');
    expect(manifest).not.toHaveProperty('pubkey');
  });

  it('preserves inline executable scripts in the default single-file mode', async () => {
    // NIP-5D loads a napplet as a single self-contained `/index.html` via
    // `iframe.srcdoc` with `sandbox="allow-scripts"` (opaque origin), so inline
    // JS is the norm — it MUST NOT be rejected at build time. (Regression guard
    // for napplet/web#53.)
    const fixture = makeFixture();
    fs.writeFileSync(
      path.join(fixture.dist, 'index.html'),
      '<!doctype html><script type="module">console.log("inline")</script>',
    );

    await expect(
      runCloseBundle({ nappletType: 'inline-default' }, fixture),
    ).resolves.toMatchObject({ warnings: [] });

    const html = fs.readFileSync(path.join(fixture.dist, 'index.html'), 'utf-8');
    expect(html).toContain('<script type="module">console.log("inline")</script>');
  });

  it('preserves a pre-existing inline script while inlining external assets in single-file mode', async () => {
    // The exact napplet/web#53 case: a single-file napplet whose built
    // index.html already carries an inline `<script type="module">`. Single-file
    // mode must fold in the external asset AND leave the inline script intact.
    const fixture = makeFixture();
    fs.writeFileSync(
      path.join(fixture.dist, 'index.html'),
      [
        '<!doctype html><html><head></head><body>',
        '<script type="module">window.__napplet_boot = true;</script>',
        '<script type="module" src="./assets/index.js"></script>',
        '</body></html>',
      ].join(''),
    );
    fs.writeFileSync(path.join(fixture.dist, 'assets', 'index.js'), 'console.log("ext");');

    await runCloseBundle(
      { nappletType: 'inline-plus-asset', artifactMode: 'single-file' },
      fixture,
    );

    const html = fs.readFileSync(path.join(fixture.dist, 'index.html'), 'utf-8');
    // Pre-existing inline script survives verbatim.
    expect(html).toContain('<script type="module">window.__napplet_boot = true;</script>');
    // External asset is folded inline and the original src reference is gone.
    expect(html).toContain('<script type="module">console.log("ext");</script>');
    expect(html).not.toContain('src="./assets/index.js"');
    expect(fs.existsSync(path.join(fixture.dist, 'assets', 'index.js'))).toBe(false);
  });

  it('emits a NIP-5D kind 35129 named manifest with a direct artifact x tag', async () => {
    const fixture = makeFixture();
    fs.writeFileSync(
      path.join(fixture.dist, 'index.html'),
      [
        '<!doctype html><html><head>',
        '',
        '<link rel="stylesheet" href="./assets/index.css">',
        '</head><body>',
        '<script type="module" src="./assets/index.js"></script>',
        '</body></html>',
      ].join(''),
    );
    fs.writeFileSync(path.join(fixture.dist, 'assets', 'index.css'), '.app { color: red; }');
    fs.writeFileSync(path.join(fixture.dist, 'assets', 'index.js'), 'console.log("single");');

    await runCloseBundle(
      { nappletType: 'single-file', artifactMode: 'single-file' },
      fixture,
    );

    const manifest = readManifest(fixture.dist);
    const html = fs.readFileSync(path.join(fixture.dist, 'index.html'), 'utf-8');
    // The plugin never writes the aggregate hash back into index.html (a file
    // cannot contain a hash that covers itself), so the on-disk html IS the hash
    // input — no meta to strip.
    expect(html).not.toContain('napplet-aggregate-hash');
    const indexHash = sha256(html);
    const expected = indexHash;

    expect(html).toContain('<style>.app { color: red; }</style>');
    expect(html).toContain('<script type="module">console.log("single");</script>');
    expect(html).not.toContain('src="./assets/index.js"');
    expect(fs.existsSync(path.join(fixture.dist, 'assets', 'index.js'))).toBe(false);
    expect(fs.existsSync(path.join(fixture.dist, 'assets', 'index.css'))).toBe(false);

    // NIP-5D kind + NIP-5A manifest shape.
    expect(manifest.kind).toBe(NAPPLET_KIND_NAMED);
    expect(manifest.kind).toBe(35129);
    expect(manifest.artifactHash).toBe(expected);
    // Per-file `path` tags carry ABSOLUTE paths and the file sha256.
    expect(manifest.tags.some((tag) => tag[0] === 'path')).toBe(false);
    // Exactly one aggregate `x` tag carrying the recomputable aggregate hash.
    const xTags = manifest.tags.filter((tag) => tag[0] === 'x');
    expect(xTags).toEqual([['x', manifest.artifactHash]]);
  });

  it('resolves single-file asset references against Vite base variants', async () => {
    const cases = [
      { base: './', href: './assets/index.css', src: './assets/index.js' },
      { base: '/', href: '/assets/index.css', src: '/assets/index.js' },
      { base: '/subapp/', href: '/subapp/assets/index.css', src: '/subapp/assets/index.js' },
    ];

    for (const testCase of cases) {
      const fixture = makeFixture();
      fs.writeFileSync(
        path.join(fixture.dist, 'index.html'),
        [
          '<!doctype html><html><head>',
          '',
          `<link rel="stylesheet" href="${testCase.href}">`,
          '</head><body>',
          `<script type="module" src="${testCase.src}"></script>`,
          '</body></html>',
        ].join(''),
      );
      fs.writeFileSync(path.join(fixture.dist, 'assets', 'index.css'), '.app { color: blue; }');
      fs.writeFileSync(path.join(fixture.dist, 'assets', 'index.js'), 'console.log("base");');

      await runCloseBundle(
        { nappletType: `base-${testCase.base}`, artifactMode: 'single-file' },
        fixture,
        { base: testCase.base },
      );

      const html = fs.readFileSync(path.join(fixture.dist, 'index.html'), 'utf-8');
      expect(html).toContain('<style>.app { color: blue; }</style>');
      expect(html).toContain('<script type="module">console.log("base");</script>');
      expect(fs.existsSync(path.join(fixture.dist, 'assets', 'index.js'))).toBe(false);
      expect(fs.existsSync(path.join(fixture.dist, 'assets', 'index.css'))).toBe(false);
    }
  });

  it('fails single-file mode when code-split chunks remain', async () => {
    const fixture = makeFixture();
    fs.writeFileSync(
      path.join(fixture.dist, 'index.html'),
      [
        '<!doctype html><html><head>',
        '',
        '<link rel="modulepreload" href="./assets/chunk.js">',
        '</head><body>',
        '<script type="module" src="./assets/index.js"></script>',
        '</body></html>',
      ].join(''),
    );
    fs.writeFileSync(path.join(fixture.dist, 'assets', 'index.js'), 'import("./chunk.js");');
    fs.writeFileSync(path.join(fixture.dist, 'assets', 'chunk.js'), 'console.log("chunk");');

    await expect(
      runCloseBundle(
        { nappletType: 'chunked', artifactMode: 'single-file' },
        fixture,
      ),
    ).rejects.toThrow('local external assets remain');
  });

  it('fails with a clear error when dist/index.html is missing', async () => {
    const fixture = makeFixture();
    fs.writeFileSync(path.join(fixture.dist, 'assets', 'index.js'), 'console.log("app");');

    const error = await runCloseBundle({ nappletType: 'missing-index' }, fixture).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('[nip5a-manifest] dist/index.html not found');
    expect((error as Error).message).not.toContain('ENOENT');
  });

  it('warns that external-assets manifests hash only index.html', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fixture = makeFixture();
    const html = '<!doctype html><script type="module" src="/assets/index.js"></script>';
    fs.writeFileSync(path.join(fixture.dist, 'index.html'), html);
    fs.writeFileSync(path.join(fixture.dist, 'assets', 'index.js'), 'console.log("app");');

    await runCloseBundle({ nappletType: 'external', artifactMode: 'external-assets' }, fixture);

    const messages = warn.mock.calls.map((call) => String(call[0]));
    const pluginWarnings = messages.filter((message) => message.includes('[nip5a-manifest]'));
    expect(pluginWarnings).toHaveLength(1);
    expect(pluginWarnings[0]).toContain('hashes only dist/index.html');
    expect(pluginWarnings[0]).toContain('assets/index.js');
    expect(readManifest(fixture.dist).tags).toContainEqual(['x', sha256(html)]);
    expect(fs.existsSync(path.join(fixture.dist, 'assets', 'index.js'))).toBe(true);
  });

  it('does not warn for a self-contained external-assets build', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fixture = makeFixture();
    fs.writeFileSync(
      path.join(fixture.dist, 'index.html'),
      '<!doctype html><script type="module">console.log("inline")</script>',
    );

    await runCloseBundle({ nappletType: 'self-contained', artifactMode: 'external-assets' }, fixture);

    const messages = warn.mock.calls.map((call) => String(call[0]));
    expect(messages.some((message) => message.includes('[nip5a-manifest]'))).toBe(false);
  });

  it('excludes config from the NIP-5A aggregate but still emits its tag', async () => {
    // NIP-5D §Identity: the runtime recomputes artifactHash from the artifact
    // tags ALONE and asserts it equals the `x` tag. The `config` capability
    // declaration is emitted as its own tag but MUST NOT feed the aggregate —
    // otherwise a conformant runtime would reject the napplet.
    const baseFixture = makeFixture();
    const configFixture = makeFixture();
    const html = '<!doctype html><script type="module" src="./assets/index.js"></script>';

    for (const fixture of [baseFixture, configFixture]) {
      fs.writeFileSync(path.join(fixture.dist, 'index.html'), html);
      fs.writeFileSync(path.join(fixture.dist, 'assets', 'index.js'), 'console.log("same");');
    }

    await runCloseBundle(
      { nappletType: 'synthetic-base', artifactMode: 'single-file' },
      baseFixture,
    );
    await runCloseBundle(
      {
        nappletType: 'synthetic-config',
        artifactMode: 'single-file',
        configSchema: {
          type: 'object',
          properties: { theme: { type: 'string', default: 'dark' } },
        },
      },
      configFixture,
    );

    const base = readManifest(baseFixture.dist);
    const withConfig = readManifest(configFixture.dist);

    // Identical dist bytes → identical aggregate, regardless of capabilities.
    expect(withConfig.artifactHash).toBe(base.artifactHash);

    // Capability tags are still present on the manifest.
    expect(withConfig.tags.some((tag) => tag[0] === 'config')).toBe(true);

    // The ONLY `x` tag on each manifest is the path-tags aggregate — no
    // capability bytes leak into the content address under any disguise.
    for (const manifest of [base, withConfig]) {
      expect(manifest.tags.filter((tag) => tag[0] === 'x')).toEqual([
        ['x', manifest.artifactHash],
      ]);
      expect(manifest.tags.some((tag) => tag[1] === 'config:schema')).toBe(false);
    }
  });

  it('emits exactly one queryless archetype contract without optional event kinds', async () => {
    // NAAT (napplet/naps ARCHETYPES.md): a napplet declares each fulfilled
    // role with one convention. Per NIP-5D §Identity these tags are excluded
    // from the aggregate `x` hash (same as `config`).
    const baseFixture = makeFixture();
    const archetypeFixture = makeFixture();
    const html = '<!doctype html><script type="module" src="./assets/index.js"></script>';

    for (const fixture of [baseFixture, archetypeFixture]) {
      fs.writeFileSync(path.join(fixture.dist, 'index.html'), html);
      fs.writeFileSync(path.join(fixture.dist, 'assets', 'index.js'), 'console.log("same");');
    }

    await runCloseBundle(
      { nappletType: 'archetype-base', artifactMode: 'single-file' },
      baseFixture,
    );
    await runCloseBundle(
      {
        nappletType: 'archetype-roles',
        artifactMode: 'single-file',
        archetypes: [{ slug: 'note', convention: 'napplet:note/open' }],
      },
      archetypeFixture,
    );

    const base = readManifest(baseFixture.dist);
    const withArchetypes = readManifest(archetypeFixture.dist);

    const archetypeTags = withArchetypes.tags.filter((tag) => tag[0] === 'z' || tag[0] === 'i');
    expect(archetypeTags).toEqual([['z', 'note'], ['i', 'napplet:note/open']]);
  });

  it('rejects numbered convention identifiers before writing a manifest', async () => {
    const fixture = makeFixture();
    fs.writeFileSync(path.join(fixture.dist, 'index.html'), '<!doctype html>');

    await expect(
      runCloseBundle(
        {
          nappletType: 'numbered-archetype',
          archetypes: [{ slug: 'note', convention: 'NAP-4' }],
        },
        fixture,
      ),
    ).rejects.toThrow(/numbered NAP identifier/i);

    expect(fs.existsSync(path.join(fixture.dist, '.nip5a-manifest.json'))).toBe(false);
  });

  it('emits one canonical tag for each archetype convention', async () => {
    const fixture = makeFixture();
    fs.writeFileSync(path.join(fixture.dist, 'index.html'), '<!doctype html>');

    await runCloseBundle(
      {
        nappletType: 'contract-archetypes',
        archetypes: [
          { slug: 'note', convention: 'napplet:note/open' },
          { slug: 'note', convention: 'napplet:note/edit' },
          { slug: 'profile', convention: 'napplet:note/open' },
        ],
      },
      fixture,
    );

    const archetypeTags = readManifest(fixture.dist).tags.filter((tag) => tag[0] === 'z' || tag[0] === 'i');
    expect(archetypeTags).toEqual([
      ['z', 'note'], ['i', 'napplet:note/open'],
      ['i', 'napplet:note/edit'], ['z', 'profile'],
    ]);
  });

  it.each([
    {
      name: 'query-bearing convention metadata',
      entry: { slug: 'note', convention: 'napplet:note/open?kind=1' },
      error: /queryless/i,
    },
    {
      name: 'fragment-bearing convention metadata',
      entry: { slug: 'note', convention: 'napplet:note/open#fragment' },
      error: /queryless/i,
    },
  ])('rejects $name', async ({ entry, error }) => {
    const fixture = makeFixture();
    fs.writeFileSync(path.join(fixture.dist, 'index.html'), '<!doctype html>');

    await expect(
      runCloseBundle(
        {
          nappletType: 'invalid-archetype-contract',
          archetypes: [entry],
        },
        fixture,
      ),
    ).rejects.toThrow(error);

    expect(fs.existsSync(path.join(fixture.dist, '.nip5a-manifest.json'))).toBe(false);
  });

  it('keeps archetype metadata outside artifact identity', async () => {
    const baseFixture = makeFixture();
    const archetypeFixture = makeFixture();
    const html = '<!doctype html><script type="module" src="./assets/index.js"></script>';

    for (const fixture of [baseFixture, archetypeFixture]) {
      fs.writeFileSync(path.join(fixture.dist, 'index.html'), html);
      fs.writeFileSync(path.join(fixture.dist, 'assets', 'index.js'), 'console.log("same");');
    }

    await runCloseBundle(
      { nappletType: 'archetype-base', artifactMode: 'single-file' },
      baseFixture,
    );
    await runCloseBundle(
      {
        nappletType: 'archetype-roles',
        artifactMode: 'single-file',
        archetypes: [{ slug: 'note', convention: 'napplet:note/open' }],
      },
      archetypeFixture,
    );

    const base = readManifest(baseFixture.dist);
    const withArchetypes = readManifest(archetypeFixture.dist);

    // Identical artifact bytes retain the same hash regardless of archetype metadata.
    expect(withArchetypes.artifactHash).toBe(base.artifactHash);

    // The base build (no archetypes) emits no archetype tag at all.
    expect(base.tags.some((tag) => tag[0] === 'z' || tag[0] === 'i')).toBe(false);

    // The ONLY `x` tag on each manifest stays the path-tags aggregate.
    for (const manifest of [base, withArchetypes]) {
      expect(manifest.tags.filter((tag) => tag[0] === 'x')).toEqual([
        ['x', manifest.artifactHash],
      ]);
    }
  });

  it('infers requires tags from static NAP imports', async () => {
    const fixture = makeFixture();
    fs.writeFileSync(path.join(fixture.dist, 'index.html'), '<!doctype html>');

    await runCloseBundle(
      { nappletType: 'infer-import', requires: { infer: true } },
      fixture,
      {},
      [{ id: path.join(fixture.root, 'src/main.ts'), code: "import { relayPublish } from '@napplet/nap/relay';\nrelayPublish({} as never);" }],
    );

    const manifest = readManifest(fixture.dist);
    expect(manifest.tags).toContainEqual(['R', 'relay']);
  });

  it('infers requires tags from SDK subpath imports and direct window.napplet usage', async () => {
    const fixture = makeFixture();
    fs.writeFileSync(path.join(fixture.dist, 'index.html'), '<!doctype html>');

    await runCloseBundle(
      { nappletType: 'infer-mixed', requires: { infer: true } },
      fixture,
      {},
      [{
        id: path.join(fixture.root, 'src/main.ts'),
        code: [
          "import { storageGetItem } from '@napplet/nap/storage';",
          'window.napplet.identity.getPublicKey();',
        ].join('\n'),
      }],
    );

    const manifest = readManifest(fixture.dist);
    expect(manifest.tags.filter((tag) => tag[0] === 'R')).toEqual([
      ['R', 'identity'],
      ['R', 'storage'],
    ]);
  });

  it('does not infer requirements from type-only imports or dynamic window access', async () => {
    const fixture = makeFixture();
    fs.writeFileSync(path.join(fixture.dist, 'index.html'), '<!doctype html>');

    await runCloseBundle(
      { nappletType: 'infer-none', requires: { infer: true } },
      fixture,
      {},
      [{
        id: path.join(fixture.root, 'src/main.ts'),
        code: [
          "import type { RelayRequest } from '@napplet/nap/relay/types';",
          "const domain = 'identity';",
          'window.napplet[domain];',
        ].join('\n'),
      }],
    );

    const manifest = readManifest(fixture.dist);
    expect(manifest.tags.some((tag) => tag[0] === 'R')).toBe(false);
  });

  it('preserves explicit array requirements without inference', async () => {
    const fixture = makeFixture();
    fs.writeFileSync(path.join(fixture.dist, 'index.html'), '<!doctype html>');

    await runCloseBundle(
      { nappletType: 'explicit-requires', requires: ['relay'] },
      fixture,
      {},
      [{ id: path.join(fixture.root, 'src/main.ts'), code: "import '@napplet/nap/storage';" }],
    );

    const manifest = readManifest(fixture.dist);
    expect(manifest.tags.filter((tag) => tag[0] === 'R')).toEqual([['R', 'relay']]);
  });

  it('accepts count as an explicit or inferred requirement', async () => {
    const explicitFixture = makeFixture();
    fs.writeFileSync(path.join(explicitFixture.dist, 'index.html'), '<!doctype html>');
    await runCloseBundle(
      { nappletType: 'explicit-count', requires: ['count'] },
      explicitFixture,
      {},
    );
    expect(readManifest(explicitFixture.dist).tags).toContainEqual(['R', 'count']);

    const inferredFixture = makeFixture();
    fs.writeFileSync(path.join(inferredFixture.dist, 'index.html'), '<!doctype html>');
    await runCloseBundle(
      { nappletType: 'inferred-count', requires: { infer: true } },
      inferredFixture,
      {},
      [{ id: path.join(inferredFixture.root, 'src/main.ts'), code: "import '@napplet/nap/count';" }],
    );
    expect(readManifest(inferredFixture.dist).tags).toContainEqual(['R', 'count']);
  });

  it('dedupes explicit and inferred requirements', async () => {
    const fixture = makeFixture();
    fs.writeFileSync(path.join(fixture.dist, 'index.html'), '<!doctype html>');

    await runCloseBundle(
      { nappletType: 'dedupe-requires', requires: { infer: true, explicit: ['relay'] } },
      fixture,
      {},
      [{ id: path.join(fixture.root, 'src/main.ts'), code: "import '@napplet/nap/relay';" }],
    );

    const manifest = readManifest(fixture.dist);
    expect(manifest.tags.filter((tag) => tag[0] === 'R')).toEqual([['R', 'relay']]);
  });

  it('warns but builds when inference finds a requirement missing from explicit config', async () => {
    const fixture = makeFixture();
    fs.writeFileSync(path.join(fixture.dist, 'index.html'), '<!doctype html>');

    const result = await runCloseBundle(
      { nappletType: 'warn-requires', requires: { infer: true, explicit: ['relay'], mode: 'warn' } },
      fixture,
      {},
      [{ id: path.join(fixture.root, 'src/main.ts'), code: "import '@napplet/nap/storage';" }],
    );

    expect(result.warnings.some((warning) => warning.includes('missing explicit requires'))).toBe(true);
    const manifest = readManifest(fixture.dist);
    expect(manifest.tags.filter((tag) => tag[0] === 'R')).toEqual([
      ['R', 'relay'],
      ['R', 'storage'],
    ]);
  });

  it('fails when inference finds a missing explicit requirement in error mode', async () => {
    const fixture = makeFixture();
    fs.writeFileSync(path.join(fixture.dist, 'index.html'), '<!doctype html>');

    await expect(
      runCloseBundle(
        { nappletType: 'error-requires', requires: { infer: true, explicit: [], mode: 'error' } },
        fixture,
        {},
        [{ id: path.join(fixture.root, 'src/main.ts'), code: "import '@napplet/nap/relay';" }],
      ),
    ).rejects.toThrow('missing explicit requires');
  });
});

describe('nip5aManifest title/description HTML metadata', () => {
  // The plugin's title/description options inject PLAIN HTML `<title>` /
  // `<meta name="description">` (NOT napplet-* protocol meta). The napplet CLI
  // reads these back out of the built index.html to emit the NIP-5A
  // `["title", …]` / `["description", …]` manifest tags.
  function transformIndexHtml(
    options: Nip5aManifestOptions,
    html: string,
  ): IndexHtmlTransformResult {
    const plugin = nip5aManifest(options);
    const hook = plugin.transformIndexHtml as (
      html: string,
      ctx?: unknown,
    ) => IndexHtmlTransformResult;
    return hook.call(plugin, html);
  }

  function transformedHtml(options: Nip5aManifestOptions, html: string): string {
    const result = transformIndexHtml(options, html);
    if (result && !Array.isArray(result) && typeof result === 'object' && 'html' in result) {
      return result.html;
    }
    throw new Error('expected an html-string transform result');
  }

  it('overrides an existing <title> with the title option', () => {
    const out = transformedHtml(
      { nappletType: 'feed', title: 'My Napp' },
      '<!doctype html><html><head><title>Old</title></head><body></body></html>',
    );
    expect(out).toContain('<title>My Napp</title>');
    expect(out).not.toContain('Old');
  });

  it('injects a <title> after <head> when none exists', () => {
    const out = transformedHtml(
      { nappletType: 'feed', title: 'My Napp' },
      '<!doctype html><html><head></head><body></body></html>',
    );
    expect(out).toContain('<head><title>My Napp</title></head>');
  });

  it('overrides an existing description meta (single/double quotes, attr order)', () => {
    for (const meta of [
      '<meta name="description" content="stale">',
      "<meta name='description' content='stale'>",
      '<meta content="stale" name="description">',
    ]) {
      const out = transformedHtml(
        { nappletType: 'feed', description: 'A cool napplet' },
        `<!doctype html><html><head>${meta}</head><body></body></html>`,
      );
      expect(out).toContain('content="A cool napplet"');
      expect(out).not.toContain('stale');
    }
  });

  it('injects a description meta after <head> when none exists', () => {
    const out = transformedHtml(
      { nappletType: 'feed', description: 'A cool napplet' },
      '<!doctype html><html><head></head><body></body></html>',
    );
    expect(out).toContain('<head><meta name="description" content="A cool napplet"></head>');
  });

  it('leaves spec-faithful author HTML untouched without injecting napplet protocol meta', () => {
    const html = '<!doctype html><html><head><title>Author</title></head><body></body></html>';
    const result = transformIndexHtml({ nappletType: 'feed' }, html);
    expect(result).toEqual([]);
  });

  it('keeps title and description transforms free of napplet protocol meta', () => {
    const result = transformIndexHtml(
      { nappletType: 'feed', title: 'My Napp', requires: ['storage'] },
      '<!doctype html><html><head></head><body></body></html>',
    );
    expect(result).toMatchObject({ tags: [] });
  });

  it('HTML-escapes injected title (element text) and description (attribute) values', () => {
    const out = transformedHtml(
      { nappletType: 'feed', title: 'Hi <b> & "you"', description: 'A "cool" & <napplet>' },
      '<!doctype html><html><head><title>Old</title><meta name="description" content="stale"></head><body></body></html>',
    );
    // Title: element-text escaping (& < >), quote left as-is.
    expect(out).toContain('<title>Hi &lt;b&gt; &amp; "you"</title>');
    // Description: attribute escaping (& "), angle brackets safe inside quotes.
    expect(out).toContain('content="A &quot;cool&quot; &amp; <napplet>"');
    expect(out).not.toContain('stale');
  });
});


describe('current manifest metadata', () => {
  it('keeps optional inferred domains optional and advertises intent parameters', async () => {
    const fixture = makeFixture();
    fs.writeFileSync(path.join(fixture.dist, 'index.html'), '<!doctype html>');
    await runCloseBundle({ nappletType: 'metadata', description: '<text> is plain text', requires: { infer: true }, optional: ['theme'], archetypes: [{ slug: 'feed', convention: 'napplet:feed/edit', params: ['filters', 'relays'] }] }, fixture, {}, [{ id: 'main.ts', code: "import '@napplet/nap/theme'; import '@napplet/nap/relay';" }]);
    const manifest = JSON.parse(fs.readFileSync(path.join(fixture.dist, '.nip5a-manifest.json'), 'utf8'));
    expect(manifest.content).toBe('<text> is plain text');
    expect(manifest.tags).toContainEqual(['R', 'relay']);
    expect(manifest.tags).toContainEqual(['O', 'theme']);
    expect(manifest.tags).not.toContainEqual(['R', 'theme']);
    expect(manifest.tags).toContainEqual(['i', 'napplet:feed/edit', 'filters', 'relays']);
    expect(manifest.tags.some((tag: string[]) => ['path', 'requires', 'description', 'archetype'].includes(tag[0]))).toBe(false);
  });

  it('uses the author HTML description and rejects missing descriptions', async () => {
    const fixture = makeFixture();
    fs.writeFileSync(path.join(fixture.dist, 'index.html'), '<meta name="description" content="Read &amp; write">');
    await runCloseBundle({ nappletType: 'metadata', description: undefined }, fixture);
    expect(JSON.parse(fs.readFileSync(path.join(fixture.dist, '.nip5a-manifest.json'), 'utf8')).content).toBe('Read & write');
    await expect(runCloseBundle({ nappletType: 'metadata', description: '' }, fixture)).rejects.toThrow(/description/);
  });
});

it('rejects query-bearing independent intent advertisements and preserves parameter names', async () => {
  const fixture = makeFixture();
  fs.writeFileSync(path.join(fixture.dist, 'index.html'), '<!doctype html>');
  await expect(runCloseBundle({ nappletType: 'note', intents: [{ intent: 'napplet:note/open?id=1' }] }, fixture)).rejects.toThrow('queryless');
  await runCloseBundle({ nappletType: 'note', intents: [{ intent: 'napplet:note/open', params: ['id'] }] }, fixture);
  expect(readManifest(fixture.dist).tags).toContainEqual(['i', 'napplet:note/open', 'id']);
});
