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
import { inlineSingleFileBuildAssets, listLocalArtifactAssets } from './html.js';
import { readPublishingMetadata, renderPublishingMetadata, replaceHeadMetadata } from './publishing-metadata.js';
import { resolvePublishingIcon } from './publishing-icon.js';
import { blobExtension, resolvePresentationMedia, type PresentationBlob } from './publishing-media.js';
import { resolvedRequirements, reportRequirementDiagnostics } from './requirements.js';

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
export async function writeBundleManifest(options: Nip5aManifestOptions, state: ManifestPluginState, warn: (message: string) => void = console.warn): Promise<void> {
  const distPath = path.resolve(state.outDir);
  if (!fs.existsSync(distPath)) {
    console.error(`[nip5a-manifest] dist directory not found: ${distPath}`);
    return;
  }


  const privkeyHex = process.env.VITE_DEV_PRIVKEY_HEX;
  const { blobs, ...metadata } = embedManifestMetadata(options, distPath, state, warn);
  prepareDistIndexHtml(distPath, state);
  const artifactHash = sha256File(path.join(distPath, 'index.html'));
  metadata.tags.splice(1, 0, ['x', artifactHash]);
  const manifest: ManifestTemplate = { ...metadata, artifactHash };
  await writeManifestFile(distPath, manifest, privkeyHex);
  // Presentation blobs are not part of the artifact (NIP-5D §Presentation media
  // resolves them by their own hash), so they land after index.html is final.
  for (const blob of blobs) {
    fs.writeFileSync(path.join(distPath, `${blob.sha256}.${blobExtension(blob.mimeType)}`), blob.data);
  }
}

function prepareDistIndexHtml(distPath: string, state: ManifestPluginState): void {
  const indexPath = path.join(distPath, 'index.html');
  // NIP-5D §Manifest: "A napplet is a single self-contained /index.html".
  if (!fs.existsSync(indexPath)) {
    throw new Error(
      `[nip5a-manifest] dist/index.html not found in ${distPath}. A NIP-5D napplet is a single self-contained /index.html, so the build must emit index.html at the outDir root.`,
    );
  }

  let html = fs.readFileSync(indexPath, 'utf-8');
  if (state.artifactMode === 'single-file') {
    html = inlineSingleFileBuildAssets(html, distPath, state.base);
    fs.writeFileSync(indexPath, html);
    return;
  }

  // external-assets is an explicit opt-in that needs rebundling before deployment
  // (see README), so leftover assets warn rather than fail the build.
  const assets = listLocalArtifactAssets(html, distPath);
  if (assets.length > 0) {
    const list = assets.map((asset) => `  - ${asset}`).join('\n');
    console.warn(
      `[nip5a-manifest] artifactMode 'external-assets': the manifest x tag hashes only dist/index.html. These local assets are not part of the NIP-5D artifact and need rebundling before deployment:\n${list}`,
    );
  }
}

function embedManifestMetadata(
  options: Nip5aManifestOptions,
  distPath: string,
  state: ManifestPluginState,
  warn: (message: string) => void,
): Omit<ManifestTemplate, 'artifactHash'> & { blobs: PresentationBlob[] } {
  const indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) throw new Error('[nip5a-manifest] dist/index.html not found; NIP-5D requires /index.html');
  const html = fs.readFileSync(indexPath, 'utf-8');
  const metadata = readPublishingMetadata(html);
  const values = (name: string): string[][] => metadata.tags.filter((tag) => tag[0] === name);
  const description = options.description ?? values('description')[0]?.[1];
  // NIP-5D §Manifest requires non-empty plain-text content.
  if (!description?.trim()) throw new Error('[nip5a-manifest] Set description or an HTML description meta for NIP-5D manifest content');
  const optional = resolvedRequirements(options.optional ?? values('O').map((t) => t[1]), state);
  const requires = options.requires ?? values('R').map((t) => t[1]);
  reportRequirementDiagnostics(requires, state, warn, optional);
  const required = resolvedRequirements(requires, state).filter((name) => !optional.includes(name));
  const title = options.title ?? values('title')[0]?.[1];
  const icon = resolvePublishingIcon(options.icon, metadata.icons);
  const source = options.source ?? values('source')[0]?.[1];
  const sourcePins = buildSourcePinTags(options, source, warn);
  const media = resolvePresentationMedia(options, warn);
  const manifest: Omit<ManifestTemplate, 'artifactHash'> = {
    kind: NAPPLET_KIND_NAMED,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', options.nappletType],
      ...(title ? [['title', title]] : []),
      ...(source ? [['source', source]] : []),
      ...sourcePins,
      ...(options.servers ?? values('server').map((t) => t[1])).map((server) => ['server', server]),
      ...(icon ? [['icon', icon.sha256, icon.mimeType]] : []),
      ...media.tags,
      ...(state.resolvedSchema !== null ? [['config', JSON.stringify(state.resolvedSchema)]] : []),
      ...required.map((name) => ['R', name]),
      ...optional.map((name) => ['O', name]),
      ...(options.archetypes === undefined ? values('z') : buildArchetypeTags(options.archetypes)),
      ...(options.intents !== undefined ? buildIntentTags(options.intents) : options.archetypes === undefined ? values('i') : []),
    ],
    content: description,
  };
  manifest.tags = manifest.tags.filter((tag, i, tags) => tags.findIndex((t) => JSON.stringify(t) === JSON.stringify(tag)) === i);
  for (const tag of manifest.tags.filter((t) => t[0] === 'i')) {
    if (!tag[1] || tag[1].includes('?') || tag.slice(1).some((part) => !part || /[\t\n\f\r ]/.test(part))) {
      throw new Error('[nip5a-manifest] intent identity and parameter names must be non-empty ASCII-whitespace-free tokens; identity must be queryless');
    }
  }
  fs.writeFileSync(indexPath, replaceHeadMetadata(html, renderPublishingMetadata(manifest.tags, description,
    icon?.url ? { url: icon.url, mimeType: icon.mimeType } : undefined)));
  // NIP-5D defines no HTML mapping for presentation media; the caller writes the
  // bytes beside index.html so deploy tooling can upload them to the declared servers.
  return { ...manifest, blobs: media.blobs };
}

// NIP-5D §Source: one optional revision pin and one optional source archive.
function buildSourcePinTags(
  options: Pick<Nip5aManifestOptions, 'sourceCommit' | 'sourceArchive'>,
  source: string | undefined,
  warn: (message: string) => void,
): string[][] {
  const tags: string[][] = [];
  if (options.sourceCommit !== undefined) {
    if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(options.sourceCommit)) {
      throw new Error('[nip5a-manifest] sourceCommit must be a full lowercase-hex Git commit ID (40 or 64 characters)');
    }
    if (!source) warn('[nip5a-manifest] sourceCommit without a source repository is ignored by clients (NIP-5D §Source); set source or let deploy tooling infer it.');
    tags.push(['source-commit', options.sourceCommit]);
  }
  if (options.sourceArchive !== undefined) {
    const { url, sha256, mimeType } = options.sourceArchive;
    let valid = false;
    try {
      const parsed = new URL(url);
      valid = parsed.protocol === 'https:' && !parsed.username && !parsed.password && !url.includes('#');
    } catch { /* reported below */ }
    if (!valid) throw new Error('[nip5a-manifest] sourceArchive.url must be an absolute HTTPS URL without credentials or a fragment');
    if (!/^[0-9a-f]{64}$/.test(sha256)) throw new Error('[nip5a-manifest] sourceArchive.sha256 must be a lowercase sha256');
    if (!/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i.test(mimeType)) throw new Error('[nip5a-manifest] sourceArchive.mimeType must be a MIME type');
    tags.push(['source-archive', url, sha256, mimeType]);
  }
  return tags;
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
