import { describe, expect, it } from 'vitest';
import {
  classifyAssetReferences,
  inventoryArtifactReferences,
  rewriteArtifactReferences,
  rewriteSupportedReferences,
  type ReferenceBuild,
  type RetainedArtifact,
} from './references.js';
import type { RetainedAsset } from './pipeline.js';

function asset(source: string): RetainedAsset {
  return {
    source,
    reference: source,
    bytes: new Uint8Array([1]),
    mime: 'application/octet-stream',
  };
}

function build(assets: RetainedAsset[], artifacts: RetainedArtifact[]): ReferenceBuild {
  return { assets, artifacts };
}

describe('optimizer reference inventory', () => {
  it('rewrites root-relative aliases at every parser-proven srcset location', () => {
    const image = { ...asset('assets/image.png'), reference: '/assets/image.png' };
    const artifact: RetainedArtifact = {
      path: 'index.html',
      kind: 'html',
      content: '<img src="/assets/image.png"><img srcset="/assets/image.png 1x, /assets/image.png 2x"><p>/assets/image.png</p>',
    };
    const inventory = inventoryArtifactReferences(build([image], [artifact]));
    const rewritten = rewriteArtifactReferences({
      artifact,
      inventory,
      replacements: new Map([['assets/image.png', 'data:image/png;base64,AQID']]),
    });

    expect(inventory.references).toHaveLength(3);
    expect(new Set(inventory.references.map((reference) => reference.location)).size).toBe(3);
    expect(rewritten.content).toBe('<img src="data:image/png;base64,AQID"><img srcset="data:image/png;base64,AQID 1x, data:image/png;base64,AQID 2x"><p>/assets/image.png</p>');
  });

  it('matches query and fragment suffixes while preserving them in scoped rewrites', () => {
    const image = { ...asset('assets/image.png'), reference: '/assets/image.png' };
    const html: RetainedArtifact = {
      path: 'index.html',
      kind: 'html',
      content: '<img src="/assets/image.png?v=1#cover"><img srcset="/assets/image.png?v=1#one 1x, /assets/image.png?v=2#two 2x"><p>/assets/image.png?v=1#cover</p>',
    };
    const css: RetainedArtifact = {
      path: 'assets/site.css',
      kind: 'stylesheet',
      content: 'background: url("/assets/image.png?v=1#cover");',
    };
    const javascript: RetainedArtifact = {
      path: 'assets/entry.js',
      kind: 'javascript',
      content: 'fetch(__nappletAssetUrl("/assets/image.png?v=1#cover"));',
    };
    const inventory = inventoryArtifactReferences(build([image], [html, css, javascript]));
    const replacements = new Map([['assets/image.png', 'data:image/png;base64,AQID']]);

    expect(inventory.references).toHaveLength(5);
    expect(rewriteArtifactReferences({ artifact: html, inventory, replacements }).content).toBe(
      '<img src="data:image/png;base64,AQID?v=1#cover"><img srcset="data:image/png;base64,AQID?v=1#one 1x, data:image/png;base64,AQID?v=2#two 2x"><p>/assets/image.png?v=1#cover</p>',
    );
    expect(rewriteArtifactReferences({ artifact: css, inventory, replacements }).content).toBe(
      'background: url("data:image/png;base64,AQID?v=1#cover");',
    );
    expect(rewriteArtifactReferences({ artifact: javascript, inventory, replacements }).content).toBe(
      'fetch(__nappletAssetUrl("data:image/png;base64,AQID?v=1#cover"));',
    );
    expect(rewriteArtifactReferences({
      artifact: javascript,
      inventory,
      replacements: new Map(),
      fetchCallReplacements: new Map([['assets/image.png', 'window.__nappletPrivateResourceLoader.response("assets/image.png")']]),
    }).content).toBe('window.__nappletPrivateResourceLoader.response("assets/image.png");');
  });

  it('rewrites recognized HTML attributes and srcset entries without touching equal text', () => {
    const image = asset('assets/image.png');
    const artifact: RetainedArtifact = {
      path: 'index.html',
      kind: 'html',
      content: '<img src="assets/image.png"><img srcset="assets/image.png 1x"><p>assets/image.png</p>',
    };
    const inventory = inventoryArtifactReferences(build([image], [artifact]));
    const rewritten = rewriteArtifactReferences({
      artifact,
      inventory,
      replacements: new Map([['assets/image.png', 'data:image/png;base64,AQID']]),
    });

    expect(rewritten.content).toBe('<img src="data:image/png;base64,AQID"><img srcset="data:image/png;base64,AQID 1x"><p>assets/image.png</p>');
    expect(rewritten.rewrittenSources).toEqual(['assets/image.png']);
  });

  it.each(['stylesheet', 'inline-css'] as const)('rewrites recognized %s URLs while preserving fragments and comments', (kind) => {
    const image = asset('assets/image.png');
    const artifact: RetainedArtifact = {
      path: kind === 'stylesheet' ? 'assets/site.css' : 'index.html',
      kind,
      content: '.hero { background: url("assets/image.png#cover"); } /* assets/image.png */',
    };
    const inventory = inventoryArtifactReferences(build([image], [artifact]));
    const rewritten = rewriteArtifactReferences({
      artifact,
      inventory,
      replacements: new Map([['assets/image.png', 'data:image/png;base64,AQID']]),
    });

    expect(rewritten.content).toBe('.hero { background: url("data:image/png;base64,AQID#cover"); } /* assets/image.png */');
    expect(rewritten.rewrittenSources).toEqual(['assets/image.png']);
  });

  it.each([
    'fetch(__nappletAssetUrl("assets/image.png"))',
    '__nappletAssetUrl("assets/image.png", "media")',
    '__nappletAssetUrl("assets/image.png")',
    'new Worker(__nappletAssetUrl("assets/image.png"))',
    'new SharedWorker(__nappletAssetUrl("assets/image.png"))',
    'import(__nappletAssetUrl("assets/image.png"))',
    'WebAssembly.instantiateStreaming(fetch(__nappletAssetUrl("assets/image.png")))',
    '"assets/image.png" + suffix',
  ])('rewrites the recognized JavaScript reference in %s without touching equal string or comment text', (reference) => {
    const image = asset('assets/image.png');
    const artifact: RetainedArtifact = {
      path: 'assets/entry.js',
      kind: 'javascript',
      content: `${reference}; const text = "assets/image.png"; // assets/image.png`,
    };
    const inventory = inventoryArtifactReferences(build([image], [artifact]));
    const rewritten = rewriteArtifactReferences({
      artifact,
      inventory,
      replacements: new Map([['assets/image.png', 'data:image/png;base64,AQID']]),
    });

    expect(rewritten.content).toBe(`${reference.replace('assets/image.png', 'data:image/png;base64,AQID')}; const text = "assets/image.png"; // assets/image.png`);
    expect(rewritten.rewrittenSources).toEqual(['assets/image.png']);
  });

  it('externalizes only the supported asynchronous fetch sentinel', () => {
    const image = asset('assets/image.png');
    const artifacts: RetainedArtifact[] = [{
      path: 'assets/entry.js',
      kind: 'javascript',
      content: [
        'const source = __nappletAssetUrl("assets/image.png");',
        'fetch(__nappletAssetUrl("assets/image.png"));',
        'const ownedMedia = __nappletAssetUrl("assets/image.png", "media");',
      ].join('\n'),
    }];
    const inventory = inventoryArtifactReferences(build([image], artifacts));

    const classification = classifyAssetReferences(image, inventory);
    expect(classification.eligible).toBe(false);
    expect(classification.reasons).toEqual(['js-media-sentinel', 'js-sentinel']);
    expect(classification.references).toContainEqual(expect.objectContaining({ form: 'js-fetch-sentinel', supported: true }));
  });

  it('uses a CSS value parser for static url and font references without corrupting values', () => {
    const image = asset('assets/image.png');
    const font = asset('assets/font.woff2');
    const css: RetainedArtifact = {
      path: 'assets/site.css',
      kind: 'stylesheet',
      content: '@font-face { src: local("Inter"), url(  "assets/font.woff2#latin"  ) format("woff2"), url(data:font/woff2;base64,AAAA); } .hero { background: /* keep */ url(assets/image.png#cover) no-repeat, url(assets/\\69 mage.png); }',
    };
    const inventory = inventoryArtifactReferences(build([image, font], [css]));
    const rewritten = rewriteSupportedReferences({
      artifact: css,
      inventory,
      replacements: new Map([
        ['assets/font.woff2', 'blossom:font.woff2'],
        ['assets/image.png', 'blossom:image.png'],
      ]),
    });

    expect(classifyAssetReferences(image, inventory).eligible).toBe(true);
    expect(classifyAssetReferences(font, inventory).eligible).toBe(true);
    expect(rewritten.content).toBe('@font-face { src: local("Inter"), url(  "blossom:font.woff2#latin"  ) format("woff2"), url(data:font/woff2;base64,AAAA); } .hero { background: /* keep */ url(blossom:image.png#cover) no-repeat, url(blossom:image.png); }');
    expect(rewritten.content).toContain('/* keep */');
    expect(rewritten.content).toContain('data:font/woff2;base64,AAAA');
  });

  it.each([
    ['direct HTML', 'html', '<img src="assets/image.png">', 'html-attribute'],
    ['srcset', 'html', '<img srcset="assets/image.png 1x">', 'html-srcset'],
    ['inline CSS', 'inline-css', 'background: url(assets/image.png)', 'inline-css'],
    ['computed string', 'javascript', 'const source = "assets/image.png" + "?v=1";', 'computed-url'],
    ['worker URL', 'javascript', 'new Worker(__nappletAssetUrl("assets/image.png"));', 'worker-url'],
    ['shared worker URL', 'javascript', 'new SharedWorker(__nappletAssetUrl("assets/image.png"));', 'worker-url'],
    ['module import', 'javascript', 'import(__nappletAssetUrl("assets/image.png"));', 'module-url'],
    ['WASM streaming', 'javascript', 'WebAssembly.instantiateStreaming(fetch(__nappletAssetUrl("assets/image.png")));', 'wasm-streaming-url'],
  ] as const)('preserves and reports %s references as ineligible', (_name, kind, content, reason) => {
    const image = asset('assets/image.png');
    const artifact: RetainedArtifact = { path: 'assets/entry', kind, content };
    const inventory = inventoryArtifactReferences(build([image], [artifact]));
    const classification = classifyAssetReferences(image, inventory);
    const rewritten = rewriteSupportedReferences({
      artifact,
      inventory,
      replacements: new Map([['assets/image.png', 'blossom:replacement.png']]),
    });

    expect(classification.eligible).toBe(false);
    expect(classification.reasons).toContain(reason);
    expect(rewritten.content).toBe(content);
  });

  it('makes a mixed asset wholly ineligible with stable reasons and locations', () => {
    const image = asset('assets/image.png');
    const inventory = inventoryArtifactReferences(build([image], [
      { path: 'assets/entry.js', kind: 'javascript', content: 'fetch(__nappletAssetUrl("assets/image.png"));' },
      { path: 'index.html', kind: 'html', content: '<img src="assets/image.png">' },
    ]));
    const classification = classifyAssetReferences(image, inventory);

    expect(classification).toMatchObject({
      eligible: false,
      reasons: ['html-attribute'],
      references: [
        expect.objectContaining({ location: 'assets/entry.js:6', supported: true }),
        expect.objectContaining({ location: 'index.html:10', supported: false }),
      ],
    });
  });
});
