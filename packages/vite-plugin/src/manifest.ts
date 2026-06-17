/**
 * @napplet/vite-plugin — manifest resolution, dev meta tags, and bundle writing.
 *
 * Wires together schema discovery/validation, dev-mode meta-tag injection, and
 * the build-time napplet manifest pipeline (NIP-5A aggregateHash computation,
 * NIP-5D kind `35129` signing, artifact rewrites, meta-tag injection).
 */

import type { IndexHtmlTransformResult } from 'vite';
import type { NappletConfigSchema } from '@napplet/nap/config/types';
import * as fs from 'fs';
import * as path from 'path';
import type { ManifestPluginState, ManifestTemplate, Nip5aManifestOptions } from './types.js';
import { NAPPLET_KIND_NAMED } from './types.js';
import { computeAggregateHash, sha256File, walkDir } from './hashing.js';
import { discoverConfigSchema, validateConfigSchema } from './config-schema.js';
import { inlineSingleFileBuildAssets } from './html.js';

/**
 * Resolve all per-build plugin state in the `configResolved` hook: out dir,
 * project root, base, and config schema (discovered + validated).
 *
 * @param options - the plugin options as authored in `vite.config.ts`.
 * @param state - mutable plugin state, populated in place.
 * @param config - the resolved Vite config subset the plugin reads.
 */
export async function resolvePluginConfig(
  options: Nip5aManifestOptions,
  state: ManifestPluginState,
  config: { build?: { outDir?: string }; root: string; base?: string },
): Promise<void> {
  state.outDir = config.build?.outDir ?? 'dist';
  state.projectRoot = config.root;
  state.base = config.base ?? '/';
  const result = await discoverConfigSchema(options, state.projectRoot);
  state.resolvedSchema = result.schema;
  state.resolvedSchemaSource = result.source;
  validateResolvedSchema(state.resolvedSchema, state.resolvedSchemaSource);
}

function validateResolvedSchema(schema: NappletConfigSchema | null, source: string | null): void {
  if (schema === null) return;

  const validation = validateConfigSchema(schema);
  if (!validation.ok) {
    const header = `[nip5a-manifest] configSchema validation failed (source: ${source ?? 'unknown'})`;
    const body = validation.errors.map((e) => `  - ${e}`).join('\n');
    throw new Error(`${header}\n${body}`);
  }
}

/**
 * Build the `transformIndexHtml` tag set: the napplet-type meta and optional
 * requires / config-schema meta tags.
 *
 * No `napplet-aggregate-hash` meta is emitted: a file cannot contain a hash that
 * covers itself, so the aggregate hash lives only in the external
 * `.nip5a-manifest.json` (and the signed kind-35129 event), where the shell /
 * relay reads it. It is not a NIP-5D/5A index.html artifact.
 *
 * @param options - the plugin options.
 * @param state - resolved plugin state (schema).
 * @param _isDev - true when Vite is serving (dev). Currently unused.
 * @returns Vite index-html transform descriptors injected into `<head>`.
 */
export function buildIndexHtmlTags(
  options: Nip5aManifestOptions,
  state: ManifestPluginState,
  _isDev: boolean,
): IndexHtmlTransformResult {
  const tags: IndexHtmlTransformResult = [
    {
      tag: 'meta',
      attrs: { name: 'napplet-type', content: options.nappletType },
      injectTo: 'head' as const,
    },
  ];

  if (options.requires && options.requires.length > 0) {
    tags.push({
      tag: 'meta',
      attrs: { name: 'napplet-requires', content: options.requires.join(',') },
      injectTo: 'head' as const,
    });
  }

  if (state.resolvedSchema !== null) {
    tags.push({
      tag: 'meta',
      attrs: { name: 'napplet-config-schema', content: JSON.stringify(state.resolvedSchema) },
      injectTo: 'head' as const,
    });
  }

  return tags;
}

/**
 * Build-only entry point: rewrite dist artifacts as configured, then (when a
 * signing key is present) compute the NIP-5A aggregateHash, sign the NIP-5D
 * kind `35129` manifest, and write `.nip5a-manifest.json`.
 *
 * The aggregate hash is written ONLY to the external manifest file — never back
 * into index.html (a file cannot advertise a hash that covers itself).
 *
 * @param options - the plugin options.
 * @param state - resolved plugin state (out dir, schema).
 */
export async function writeBundleManifest(options: Nip5aManifestOptions, state: ManifestPluginState): Promise<void> {
  const distPath = path.resolve(state.outDir);
  if (!fs.existsSync(distPath)) {
    console.error(`[nip5a-manifest] dist directory not found: ${distPath}`);
    return;
  }

  prepareDistIndexHtml(distPath, state);

  const privkeyHex = process.env.VITE_DEV_PRIVKEY_HEX;
  if (!privkeyHex) return;

  const manifest = buildManifestTemplate(options, distPath, state);
  await writeManifestFile(distPath, manifest, privkeyHex);
}

function prepareDistIndexHtml(distPath: string, state: ManifestPluginState): void {
  const indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) return;

  let html = fs.readFileSync(indexPath, 'utf-8');
  if (state.artifactMode === 'single-file') {
    html = inlineSingleFileBuildAssets(html, distPath, state.base);
    fs.writeFileSync(indexPath, html);
  }
}

function buildManifestTemplate(
  options: Nip5aManifestOptions,
  distPath: string,
  state: ManifestPluginState,
): ManifestTemplate {
  // pathPairs are `[sha256hex, absolutePath]`, the sole input to the NIP-5A
  // aggregate hash (NIP-5D §Identity: the runtime recomputes the aggregate from
  // the `path` tags alone and asserts it equals the `x` tag). The `config`
  // capability is emitted as its own tag but MUST NOT feed the aggregate, or a
  // conformant runtime would reject the napplet.
  const pathPairs = buildPathPairs(distPath);
  const aggregateHash = computeAggregateHash(pathPairs);
  const pathTags = pathPairs.map(([hash, absPath]) => ['path', absPath, hash]);
  const configTags =
    state.resolvedSchema !== null ? [['config', JSON.stringify(state.resolvedSchema)]] : [];
  const requiresTags = (options.requires ?? []).map((name) => ['requires', name]);
  // Archetype tags (NAAT, napplet/naps `ARCHETYPES.md`): one
  // `['archetype', slug, ...naps]` per declared role. Like config/requires they
  // are NOT passed to computeAggregateHash — only pathPairs feed the aggregate.
  const archetypeTags = buildArchetypeTags(options.archetypes);

  return {
    kind: NAPPLET_KIND_NAMED,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', options.nappletType],
      ...pathTags,
      ['x', aggregateHash, 'aggregate'],
      ...configTags,
      ...requiresTags,
      ...archetypeTags,
    ],
    content: '',
    aggregateHash,
  };
}

/**
 * Normalize the `archetypes` option into `['archetype', slug, ...naps]` tags.
 * Accepts the object form `{ slug, naps? }` and the string shorthand
 * (`"feed"` ≡ `{ slug: "feed" }`). Entries with an empty/blank slug are skipped.
 */
function buildArchetypeTags(
  archetypes: Nip5aManifestOptions['archetypes'],
): string[][] {
  if (!archetypes) return [];
  const tags: string[][] = [];
  for (const entry of archetypes) {
    const slug = (typeof entry === 'string' ? entry : entry.slug).trim();
    if (slug === '') continue;
    const naps = typeof entry === 'string' ? [] : entry.naps ?? [];
    tags.push(['archetype', slug, ...naps]);
  }
  return tags;
}

/**
 * Enumerate dist artifacts as NIP-5A `path`-tag pairs: `[sha256hex, absolutePath]`,
 * where the path is the dist-relative path made absolute (leading `/`, forward
 * slashes on every platform). The signed manifest itself is excluded.
 */
function buildPathPairs(distPath: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const relativePath of walkDir(distPath)) {
    if (relativePath === '.nip5a-manifest.json') continue;
    const absPath = '/' + relativePath.split(path.sep).join('/');
    pairs.push([sha256File(path.join(distPath, relativePath)), absPath]);
  }
  return pairs;
}

async function writeManifestFile(
  distPath: string,
  manifest: ManifestTemplate,
  privkeyHex: string,
): Promise<void> {
  try {
    const { finalizeEvent, getPublicKey } = await import('nostr-tools/pure');
    const { hexToBytes } = await import('nostr-tools/utils');
    const privkeyBytes = hexToBytes(privkeyHex);
    const pubkey = getPublicKey(privkeyBytes);
    const signedEvent = finalizeEvent({
      kind: NAPPLET_KIND_NAMED,
      created_at: manifest.created_at,
      tags: manifest.tags,
      content: manifest.content,
    }, privkeyBytes);

    const manifestWithMeta = { ...signedEvent, aggregateHash: manifest.aggregateHash, pubkey };
    fs.writeFileSync(path.join(distPath, '.nip5a-manifest.json'), JSON.stringify(manifestWithMeta, null, 2));
  } catch {
    fs.writeFileSync(path.join(distPath, '.nip5a-manifest.json'), JSON.stringify(manifest, null, 2));
  }
}

