import { afterEach, describe, expect, it } from 'vitest';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { IndexHtmlTransformResult } from 'vite';
import { nip5aManifest, NAPPLET_KIND_NAMED, type Nip5aManifestOptions } from './index';
import { computeAggregateHash } from './hashing';

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
): Promise<{ warnings: string[] }> {
  const previousPrivkey = process.env.VITE_DEV_PRIVKEY_HEX;
  process.env.VITE_DEV_PRIVKEY_HEX = TEST_PRIVKEY;
  const warnings: string[] = [];
  try {
    const plugin = nip5aManifest(options);
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

function readManifest(dist: string): { kind: number; aggregateHash: string; tags: string[][] } {
  return JSON.parse(
    fs.readFileSync(path.join(dist, '.nip5a-manifest.json'), 'utf-8'),
  ) as { kind: number; aggregateHash: string; tags: string[][] };
}

afterEach(() => {
  delete process.env.VITE_DEV_PRIVKEY_HEX;
  while (tempRoots.length > 0) {
    fs.rmSync(tempRoots.pop()!, { recursive: true, force: true });
  }
});

describe('NIP-5A aggregate hash', () => {
  it('matches the NIP-5A §Aggregate Hash worked example digest', () => {
    // 5A.md §Aggregate Hash worked example: two `path` tags → sorted
    // `<sha256> <absolute-path>\n` lines → UTF-8 → SHA-256, lowercase hex.
    const pairs: Array<[string, string]> = [
      ['186ea5fd14e88fd1ac49351759e7ab906fa94892002b60bf7f5a428f28ca1c99', '/index.html'],
      ['fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321', '/favicon.ico'],
    ];
    expect(computeAggregateHash(pairs)).toBe(
      'c2ff582b672a4c689c5e1753528f03dd31b95ec1fdcc3d82d25e7d91e8769638',
    );
  });

  it('ignores path-tag order (sorts lines before hashing)', () => {
    const a: [string, string] = ['aa'.repeat(32), '/a.html'];
    const b: [string, string] = ['bb'.repeat(32), '/b.html'];
    expect(computeAggregateHash([a, b])).toBe(computeAggregateHash([b, a]));
  });
});

describe('nip5aManifest artifact modes', () => {
  it('preserves inline executable scripts in the default external-assets mode', async () => {
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

  it('emits a NIP-5D kind 35129 named manifest with NIP-5A path + aggregate x tags', async () => {
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
    const expected = computeAggregateHash([[indexHash, '/index.html']]);

    expect(html).toContain('<style>.app { color: red; }</style>');
    expect(html).toContain('<script type="module">console.log("single");</script>');
    expect(html).not.toContain('src="./assets/index.js"');
    expect(fs.existsSync(path.join(fixture.dist, 'assets', 'index.js'))).toBe(false);
    expect(fs.existsSync(path.join(fixture.dist, 'assets', 'index.css'))).toBe(false);

    // NIP-5D kind + NIP-5A manifest shape.
    expect(manifest.kind).toBe(NAPPLET_KIND_NAMED);
    expect(manifest.kind).toBe(35129);
    expect(manifest.aggregateHash).toBe(expected);
    // Per-file `path` tags carry ABSOLUTE paths and the file sha256.
    expect(manifest.tags).toContainEqual(['path', '/index.html', indexHash]);
    // Exactly one aggregate `x` tag carrying the recomputable aggregate hash.
    const xTags = manifest.tags.filter((tag) => tag[0] === 'x');
    expect(xTags).toEqual([['x', manifest.aggregateHash, 'aggregate']]);
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

  it('excludes config from the NIP-5A aggregate but still emits its tag', async () => {
    // NIP-5D §Identity: the runtime recomputes aggregateHash from the `path`
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
    expect(withConfig.aggregateHash).toBe(base.aggregateHash);

    // Capability tags are still present on the manifest.
    expect(withConfig.tags.some((tag) => tag[0] === 'config')).toBe(true);

    // The ONLY `x` tag on each manifest is the path-tags aggregate — no
    // capability bytes leak into the content address under any disguise.
    for (const manifest of [base, withConfig]) {
      expect(manifest.tags.filter((tag) => tag[0] === 'x')).toEqual([
        ['x', manifest.aggregateHash, 'aggregate'],
      ]);
      expect(manifest.tags.some((tag) => tag[1] === 'config:schema')).toBe(false);
    }
  });

  it('emits one ["archetype", slug, protocol] tag per contract without changing the aggregate', async () => {
    // NAAT (napplet/naps ARCHETYPES.md): a napplet declares the roles it
    // fulfills as one ['archetype', slug, protocol, ...constraints] tag per
    // protocol. Per NIP-5D §Identity these are excluded from the aggregate `x`
    // hash (same as `config`) — declaring archetypes over identical dist bytes
    // MUST NOT change the content address.
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
        // Legacy protocol list plus explicit constrained contracts.
        archetypes: [
          { slug: 'feed', naps: ['NAP-5', 'NAP-6'] },
          { slug: 'note', contracts: [{ protocol: 'NAP-4', eventKinds: [1, 30023] }] },
          'profile',
        ],
      },
      archetypeFixture,
    );

    const base = readManifest(baseFixture.dist);
    const withArchetypes = readManifest(archetypeFixture.dist);

    // Identical dist bytes → identical aggregate, regardless of archetype tags.
    expect(withArchetypes.aggregateHash).toBe(base.aggregateHash);

    // One tag per protocol, in author-declared order. String shorthand without a
    // protocol remains accepted but emits no invalid protocol-less tag.
    const archetypeTags = withArchetypes.tags.filter((tag) => tag[0] === 'archetype');
    expect(archetypeTags).toEqual([
      ['archetype', 'feed', 'NAP-5'],
      ['archetype', 'feed', 'NAP-6'],
      ['archetype', 'note', 'NAP-4', 'kind:1', 'kind:30023'],
    ]);

    // The base build (no archetypes) emits no archetype tag at all.
    expect(base.tags.some((tag) => tag[0] === 'archetype')).toBe(false);

    // The ONLY `x` tag on each manifest stays the path-tags aggregate.
    for (const manifest of [base, withArchetypes]) {
      expect(manifest.tags.filter((tag) => tag[0] === 'x')).toEqual([
        ['x', manifest.aggregateHash, 'aggregate'],
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
    expect(manifest.tags).toContainEqual(['requires', 'relay']);
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
    expect(manifest.tags.filter((tag) => tag[0] === 'requires')).toEqual([
      ['requires', 'identity'],
      ['requires', 'storage'],
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
    expect(manifest.tags.some((tag) => tag[0] === 'requires')).toBe(false);
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
    expect(manifest.tags.filter((tag) => tag[0] === 'requires')).toEqual([['requires', 'relay']]);
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
    expect(manifest.tags.filter((tag) => tag[0] === 'requires')).toEqual([['requires', 'relay']]);
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
    expect(manifest.tags.filter((tag) => tag[0] === 'requires')).toEqual([
      ['requires', 'relay'],
      ['requires', 'storage'],
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

  it('leaves author HTML untouched and emits only tags when neither option is set', () => {
    const html = '<!doctype html><html><head><title>Author</title></head><body></body></html>';
    const result = transformIndexHtml({ nappletType: 'feed' }, html);
    // No html-string transform form — only the meta tag descriptors.
    expect(Array.isArray(result)).toBe(true);
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
