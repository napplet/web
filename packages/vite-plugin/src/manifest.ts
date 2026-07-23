/**
 * @napplet/vite-plugin — manifest resolution and bundle writing.
 *
 * Wires together schema discovery/validation and the build-time napplet manifest
 * pipeline (NIP-5A aggregateHash computation, NIP-5D kind `35129` signing, and
 * artifact rewrites).
 */

import type { NappletConfigSchema } from '@napplet/nap/config/types';
import * as fs from 'fs';
import * as path from 'path';
import type { ManifestPluginState, ManifestTemplate, Nip5aManifestOptions } from './types.js';
import { NAPPLET_KIND_NAMED } from './types.js';
import { computeAggregateHash, sha256File, walkDir } from './hashing.js';
import { discoverConfigSchema, validateConfigSchema } from './config-schema.js';
import { inlineSingleFileBuildAssets } from './html.js';
import { resolvedRequirements } from './requirements.js';

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
  const requiresTags = resolvedRequirements(options.requires, state).map((name) => ['requires', name]);
  // Archetype tags (NAAT, napplet/naps `ARCHETYPES.md`): one
  // `['archetype', slug, convention, ...kindFields]` per declared convention. Like
  // config/requires they are NOT passed to computeAggregateHash — only pathPairs
  // feed the aggregate.
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
 * Serialize each archetype contract into one queryless convention tag with
 * optional same-tag `kind:<number>` discovery fields.
 */
function buildArchetypeTags(
  archetypes: Nip5aManifestOptions['archetypes'],
): string[][] {
  if (!archetypes) return [];
  const tags: string[][] = [];
  for (const entry of archetypes) {
    const slug = entry.slug.trim();
    if (slug === '' || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
      throw new Error('[nip5a-manifest] archetype slug must contain lowercase letters, numbers, and hyphens');
    }
    const convention = entry.convention.trim();
    if (convention === '') {
      throw new Error('[nip5a-manifest] archetype convention must be a non-empty string');
    }
    if (/^NAP-\d+$/.test(convention)) {
      throw new Error('[nip5a-manifest] numbered NAP identifier is not a convention');
    }
    const conventionMatch = /^napplet:([^/?#\s]+)\/([^/?#\s]+)$/.exec(convention);
    if (!conventionMatch) {
      throw new Error('[nip5a-manifest] archetype convention must be a queryless napplet:<archetype>/<intent> identity');
    }
    if (conventionMatch[1] !== slug) {
      throw new Error('[nip5a-manifest] archetype slug must match the convention archetype');
    }
    const eventKinds = entry.eventKinds ?? [];
    for (const kind of eventKinds) {
      if (!Number.isSafeInteger(kind) || kind < 0) {
        throw new Error('[nip5a-manifest] archetype eventKinds must contain unsigned integers');
      }
    }
    tags.push([
      'archetype',
      slug,
      convention,
      ...eventKinds.map((kind) => `kind:${kind}`),
    ]);
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
