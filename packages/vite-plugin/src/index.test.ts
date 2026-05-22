import { afterEach, describe, expect, it } from 'vitest';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { nip5aManifest, type Nip5aManifestOptions } from './index';

const TEST_PRIVKEY = '01'.repeat(32);
const tempRoots: string[] = [];

function sha256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function computeAggregateHash(xTags: Array<[string, string]>): string {
  const lines = xTags.map(([hash, p]) => `${hash} ${p}\n`);
  lines.sort();
  return sha256(lines.join(''));
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

function readManifest(dist: string): { aggregateHash: string; tags: string[][] } {
  return JSON.parse(
    fs.readFileSync(path.join(dist, '.nip5a-manifest.json'), 'utf-8'),
  ) as { aggregateHash: string; tags: string[][] };
}

afterEach(() => {
  delete process.env.VITE_DEV_PRIVKEY_HEX;
  while (tempRoots.length > 0) {
    fs.rmSync(tempRoots.pop()!, { recursive: true, force: true });
  }
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

  it('inlines local JS and CSS assets in explicit single-file mode', async () => {
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
    const expected = computeAggregateHash([[sha256(hashInputHtml), 'index.html']]);

    expect(html).toContain('<style>.app { color: red; }</style>');
    expect(html).toContain('<script type="module">console.log("single");</script>');
    expect(html).not.toContain('src="./assets/index.js"');
    expect(fs.existsSync(path.join(fixture.dist, 'assets', 'index.js'))).toBe(false);
    expect(fs.existsSync(path.join(fixture.dist, 'assets', 'index.css'))).toBe(false);
    expect(manifest.aggregateHash).toBe(expected);
    expect(manifest.tags).toContainEqual(['x', sha256(hashInputHtml), 'index.html']);
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

  it('preserves config and connect synthetic aggregate hash inputs in single-file mode', async () => {
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

    expect(withConfig.aggregateHash).not.toBe(base.aggregateHash);
    expect(withConnect.aggregateHash).not.toBe(base.aggregateHash);
    expect(withConfig.tags.some((tag) => tag[0] === 'config')).toBe(true);
    expect(withConnect.tags).toContainEqual(['connect', 'https://api.example.com']);
    expect(withConfig.tags.some((tag) => tag[0] === 'x' && tag[2] === 'config:schema')).toBe(false);
    expect(withConnect.tags.some((tag) => tag[0] === 'x' && tag[2] === 'connect:origins')).toBe(false);
  });
});
