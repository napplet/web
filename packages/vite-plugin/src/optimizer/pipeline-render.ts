import * as crypto from 'crypto';
import {
  renderPrivateResourceTable,
  renderResourceLoader,
  type ResourceTableEntry,
} from './loader.js';
import {
  renderLoaderScreenMarkup,
  renderLoaderScreenStyle,
} from './loader-screen.js';
import {
  inventoryArtifactReferences,
  rewriteArtifactReferences,
  type ReferenceInventory,
} from './references.js';
import type {
  RenderInput,
  RenderedArtifact,
  RetainedAsset,
  RetainedBuild,
} from './pipeline.js';

const RENDERED_HTML_ARTIFACT_PATH = '<rendered-index.html>';
const RAW_TEXT_ELEMENTS = new Set([
  'iframe',
  'noembed',
  'noframes',
  'script',
  'style',
  'textarea',
  'title',
  'xmp',
]);

interface DocumentInjectionPoints {
  headClose: number | undefined;
  bodyContent: number | undefined;
}

export function normalizedPath(value: string): string {
  return value.replace(/\\/g, '/');
}

export function sha256(bytes: Uint8Array): string {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

export function canonicalUri(sha256Hex: string): string {
  return `blossom:${sha256Hex}.bin`;
}

export function tableEntries(selected: readonly RetainedAsset[]): ResourceTableEntry[] {
  return [...selected]
    .sort((left, right) => normalizedPath(left.source).localeCompare(normalizedPath(right.source)))
    .map((asset) => {
      const digest = sha256(asset.bytes);
      return {
        source: normalizedPath(asset.source),
        uri: canonicalUri(digest),
        sha256: digest,
        bytes: asset.bytes.byteLength,
        mime: asset.mime,
      };
    });
}

function dataUri(asset: RetainedAsset): string {
  return `data:${asset.mime};base64,${Buffer.from(asset.bytes).toString('base64')}`;
}

function htmlTagEnd(html: string, start: number): number | undefined {
  let quote: '"' | "'" | undefined;
  for (let index = start + 1; index < html.length; index += 1) {
    const character = html[index];
    if (quote) {
      if (character === quote) quote = undefined;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '>') return index;
  }
  return undefined;
}

function documentInjectionPoints(html: string): DocumentInjectionPoints {
  const lower = html.toLowerCase();
  let cursor = 0;
  let rawText: string | undefined;
  let templateDepth = 0;
  let headClose: number | undefined;
  let bodyContent: number | undefined;

  while (cursor < html.length && (headClose === undefined || bodyContent === undefined)) {
    const start = rawText
      ? lower.indexOf(`</${rawText}`, cursor)
      : html.indexOf('<', cursor);
    if (start < 0) break;
    if (!rawText && html.startsWith('<!--', start)) {
      const commentEnd = html.indexOf('-->', start + 4);
      cursor = commentEnd < 0 ? html.length : commentEnd + 3;
      continue;
    }

    const end = htmlTagEnd(html, start);
    if (end === undefined) break;

    const tag = /^<\s*(\/?)\s*([a-z][a-z0-9:-]*)/i.exec(html.slice(start, end + 1));
    if (!tag) {
      cursor = end + 1;
      continue;
    }

    const closing = tag[1] === '/';
    const name = tag[2]!.toLowerCase();

    if (rawText) {
      if (closing && name === rawText) rawText = undefined;
      cursor = end + 1;
      continue;
    }

    if (name === 'template') {
      templateDepth = closing ? Math.max(0, templateDepth - 1) : templateDepth + 1;
      cursor = end + 1;
      continue;
    }

    if (templateDepth === 0) {
      if (closing && name === 'head' && headClose === undefined) headClose = start;
      if (!closing && name === 'body' && bodyContent === undefined) bodyContent = end + 1;
    }

    if (!closing && RAW_TEXT_ELEMENTS.has(name)) rawText = name;
    cursor = end + 1;
  }

  return { headClose, bodyContent };
}

function injectPrivateMetadata(html: string, entries: readonly ResourceTableEntry[]): string {
  if (entries.length === 0) return html;

  const table = renderPrivateResourceTable(entries).replace(/<\/script/gi, '<\\/script');
  const metadata = [
    `<style data-napplet-private-loader>${renderLoaderScreenStyle()}</style>`,
    `<script type="application/json" data-napplet-private-resource-table>${table}</script>`,
    `<script>${renderResourceLoader(entries)}</script>`,
  ].join('');
  const markup = renderLoaderScreenMarkup();
  const points = documentInjectionPoints(html);
  const insertions = [
    { index: points.headClose ?? 0, value: metadata },
    { index: points.bodyContent ?? html.length, value: markup },
  ].sort((left, right) => right.index - left.index);

  let result = html;
  for (const insertion of insertions) {
    result = `${result.slice(0, insertion.index)}${insertion.value}${result.slice(insertion.index)}`;
  }
  return result;
}

export function buildReferenceInventory(build: RetainedBuild): ReferenceInventory {
  return inventoryArtifactReferences({
    assets: build.assets,
    artifacts: [
      { path: RENDERED_HTML_ARTIFACT_PATH, kind: 'html', content: build.html },
      ...(build.artifacts ?? []),
    ],
  });
}

/** Render the actual candidate HTML for a selected set, then measure its UTF-8 bytes. */
export function renderOptimizedHtml(input: RenderInput): RenderedArtifact {
  const selectedBySource = new Map(
    input.selected.map((asset) => [normalizedPath(asset.source), asset]),
  );
  const entries = input.entries ? [...input.entries] : tableEntries(input.selected);
  const inventory = input.inventory ?? buildReferenceInventory(input.build);
  const replacements = new Map(
    input.build.assets
      .filter((asset) => !selectedBySource.has(normalizedPath(asset.source)))
      .map((asset) => [normalizedPath(asset.source), dataUri(asset)]),
  );
  const fetchCallReplacements = new Map(
    [...selectedBySource.keys()].map((source) => [
      source,
      `window.__nappletPrivateResourceLoader.response("${source}")`,
    ]),
  );
  const artifact = inventory.artifacts.find(
    (candidate) => candidate.path === RENDERED_HTML_ARTIFACT_PATH,
  );
  if (!artifact) {
    throw new Error('optimizer reference inventory is missing the rendered HTML artifact');
  }

  const html = rewriteArtifactReferences({
    artifact,
    inventory,
    replacements,
    fetchCallReplacements,
  }).content;
  const renderedHtml = injectPrivateMetadata(html, entries);

  return {
    html: renderedHtml,
    bytes: Buffer.byteLength(renderedHtml),
    entries,
  };
}
