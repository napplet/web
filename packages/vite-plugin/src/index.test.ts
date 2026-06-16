import { afterEach, describe, expect, it } from 'vitest';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
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
): Promise<void> {
  const previousPrivkey = process.env.VITE_DEV_PRIVKEY_HEX;
  process.env.VITE_DEV_PRIVKEY_HEX = TEST_PRIVKEY;
  try {
    const plugin = nip5aManifest(options);
    await (plugin.configResolved as (config: unknown) => unknown)?.({
      ...viteConfig,
      root: fixture.root,
      build: { outDir: fixture.dist },
    });
    await (plugin.closeBundle as () => unknown)?.();
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
  it('rejects inline executable scripts in the default external-assets mode', async () => {
    const fixture = makeFixture();
    fs.writeFileSync(
      path.join(fixture.dist, 'index.html'),
      '<!doctype html><meta name="napplet-aggregate-hash" content=""><script type="module">console.log("inline")</script>',
    );

    await expect(
      runCloseBundle({ nappletType: 'inline-default' }, fixture),
    ).rejects.toThrow('Inline <script> elements are not allowed');
  });

  it('emits a NIP-5D kind 35129 named manifest with NIP-5A path + aggregate x tags', async () => {
    const fixture = makeFixture();
    fs.writeFileSync(
      path.join(fixture.dist, 'index.html'),
      [
        '<!doctype html><html><head>',
        '<meta name="napplet-aggregate-hash" content="">',
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
    const hashInputHtml = html.replace(
      `<meta name="napplet-aggregate-hash" content="${manifest.aggregateHash}">`,
      '<meta name="napplet-aggregate-hash" content="">',
    );
    const indexHash = sha256(hashInputHtml);
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
          '<meta name="napplet-aggregate-hash" content="">',
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
        '<meta name="napplet-aggregate-hash" content="">',
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

  it('excludes config and connect from the NIP-5A aggregate but still emits their tags', async () => {
    // NIP-5D §Identity: the runtime recomputes aggregateHash from the `path`
    // tags ALONE and asserts it equals the `x` tag. Capability declarations
    // (`config` / `connect`) are emitted as their own tags but MUST NOT feed the
    // aggregate — otherwise a conformant runtime would reject the napplet.
    // (Grant invalidation on a capability change moves to those tags at the
    // shell layer; it is no longer encoded in the content address.)
    const baseFixture = makeFixture();
    const configFixture = makeFixture();
    const connectFixture = makeFixture();
    const html = '<!doctype html><meta name="napplet-aggregate-hash" content=""><script type="module" src="./assets/index.js"></script>';

    for (const fixture of [baseFixture, configFixture, connectFixture]) {
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
    await runCloseBundle(
      {
        nappletType: 'synthetic-connect',
        artifactMode: 'single-file',
        connect: ['https://api.example.com'],
      },
      connectFixture,
    );

    const base = readManifest(baseFixture.dist);
    const withConfig = readManifest(configFixture.dist);
    const withConnect = readManifest(connectFixture.dist);

    // Identical dist bytes → identical aggregate, regardless of capabilities.
    expect(withConfig.aggregateHash).toBe(base.aggregateHash);
    expect(withConnect.aggregateHash).toBe(base.aggregateHash);

    // Capability tags are still present on the manifest.
    expect(withConfig.tags.some((tag) => tag[0] === 'config')).toBe(true);
    expect(withConnect.tags).toContainEqual(['connect', 'https://api.example.com']);

    // The ONLY `x` tag on each manifest is the path-tags aggregate — no
    // capability bytes leak into the content address under any disguise.
    for (const manifest of [base, withConfig, withConnect]) {
      expect(manifest.tags.filter((tag) => tag[0] === 'x')).toEqual([
        ['x', manifest.aggregateHash, 'aggregate'],
      ]);
      expect(manifest.tags.some((tag) => tag[1] === 'config:schema')).toBe(false);
      expect(manifest.tags.some((tag) => tag[1] === 'connect:origins')).toBe(false);
    }
  });
});
