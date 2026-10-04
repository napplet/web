/**
 * @napplet/vite-plugin — manifest resolution and bundle writing.
 *
 * Wires together schema discovery/validation and the build-time napplet manifest
 * pipeline (artifact hashing, NIP-5D kind `35129` signing, and
 * artifact rewrites).
 */

import type { NappletConfigSchema } from '@napplet/nap/config/types';
import * as fs from 'fs';
import * as path from 'path';
import type { ManifestPluginState, ManifestTemplate, Nip5aManifestOptions } from './types.js';
import { NAPPLET_KIND_NAMED } from './types.js';
import { sha256File } from './hashing.js';
import { discoverConfigSchema, validateConfigSchema } from './config-schema.js';
import { inlineSingleFileBuildAssets, readHtmlMetadata } from './html.js';
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
 * Build-only entry point: rewrite dist artifacts as configured, compute the
 * artifact hash, and write `.nip5a-manifest.json`. When a signing key is
 * present, the NIP-5D kind `35129` manifest is signed before it is written.
 *
 * The artifact hash is written ONLY to the external manifest file — never back
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
  const indexPath = path.join(distPath, 'index.html');
  const artifactHash = sha256File(indexPath);
  const metadata = readHtmlMetadata(fs.readFileSync(indexPath, 'utf-8'));
  const description = options.description ?? metadata.description;
  // NIP-5D §Manifest requires non-empty plain-text content.
  if (!description?.trim()) throw new Error('[nip5a-manifest] Set description or an HTML description meta for NIP-5D manifest content');
  const optional = resolvedRequirements(options.optional ?? [], state);
  const required = resolvedRequirements(options.requires, state).filter((name) => !optional.includes(name));
  const title = options.title ?? metadata.title;
  return {
    kind: NAPPLET_KIND_NAMED,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', options.nappletType],
      ['x', artifactHash],
      ...(title ? [['title', title]] : []),
      ...(options.source ? [['source', options.source]] : []),
      ...(options.servers ?? []).map((server) => ['server', server]),
      ...(options.icon ? [['icon', options.icon.sha256, options.icon.mimeType]] : []),
      ...(state.resolvedSchema !== null ? [['config', JSON.stringify(state.resolvedSchema)]] : []),
      ...required.map((name) => ['R', name]),
      ...optional.map((name) => ['O', name]),
      ...buildArchetypeTags(options.archetypes),
      ...buildIntentTags(options.intents),
    ],
    content: description,
    artifactHash,
  };
}

/**
 * Serialize each archetype contract into one queryless convention tag with
 * one stable queryless convention identity.
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
    tags.push(['z', slug], ['i', convention, ...(entry.params ?? [])]);
  }
  return tags.filter((tag, index) => tags.findIndex((other) => JSON.stringify(other) === JSON.stringify(tag)) === index);
}

// NIP-5D §Archetypes and Intents requires queryless advertisement identities.
function buildIntentTags(intents: Nip5aManifestOptions['intents']): string[][] {
  return (intents ?? []).map((entry) => {
    if (!entry.intent.trim() || entry.intent.includes('?')) {
      throw new Error('[nip5a-manifest] advertised intents must be non-empty queryless identities');
    }
    return ['i', entry.intent, ...(entry.params ?? [])];
  });
}

async function writeManifestFile(
  distPath: string,
  manifest: ManifestTemplate,
  privkeyHex: string | undefined,
): Promise<void> {
  const manifestPath = path.join(distPath, '.nip5a-manifest.json');
  if (!privkeyHex) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    return;
  }

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

    const manifestWithMeta = { ...signedEvent, artifactHash: manifest.artifactHash, pubkey };
    fs.writeFileSync(manifestPath, JSON.stringify(manifestWithMeta, null, 2));
  } catch {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }
}
