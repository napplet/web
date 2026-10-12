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
import { sha256File, walkDir } from './hashing.js';
import { discoverConfigSchema, validateConfigSchema } from './config-schema.js';
import { renderSingleFileBuildAssets, listLocalArtifactAssets } from './html.js';
import { effectiveRequirements, resolvedRequirements, reportRequirementDiagnostics } from './requirements.js';
import {
  createLiveOptimizationServices,
  optimizeSingleFileArtifact,
  planExternalAssets,
  renderOptimizedHtml,
  type OptimizationReport,
  type OptimizationServices,
  type RetainedAsset,
} from './optimizer/pipeline.js';
import type { RetainedArtifact } from './optimizer/references.js';
import { readPublishingMetadata, renderPublishingMetadata, replaceHeadMetadata } from './publishing-metadata.js';
import { resolvePublishingIcon } from './publishing-icon.js';

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
  state.outDir = path.resolve(config.root, config.build?.outDir ?? 'dist');
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
export async function writeBundleManifest(
  options: Nip5aManifestOptions,
  state: ManifestPluginState,
  optimizationServices?: OptimizationServices,
  warn: (message: string) => void = console.warn,
): Promise<void> {
  const distPath = path.resolve(state.outDir);
  if (!fs.existsSync(distPath)) {
    console.error(`[nip5a-manifest] dist directory not found: ${distPath}`);
    return;
  }

  embedManifestMetadata(options, distPath, state, warn, 0);
  const committedResourceCount = await prepareDistIndexHtml(distPath, state, optimizationServices);
  const privkeyHex = process.env.VITE_DEV_PRIVKEY_HEX;
  const metadata = embedManifestMetadata(options, distPath, state, warn, committedResourceCount);
  const artifactHash = sha256File(path.join(distPath, 'index.html'));
  metadata.tags.splice(1, 0, ['x', artifactHash]);
  const manifest: ManifestTemplate = { ...metadata, artifactHash };
  await writeManifestFile(distPath, manifest, privkeyHex);
}

async function prepareDistIndexHtml(
  distPath: string,
  state: ManifestPluginState,
  optimizationServices?: OptimizationServices,
): Promise<number> {
  const indexPath = path.join(distPath, 'index.html');
  // NIP-5D §Manifest: "A napplet is a single self-contained /index.html".
  if (!fs.existsSync(indexPath)) {
    throw new Error(
      `[nip5a-manifest] dist/index.html not found in ${distPath}. A NIP-5D napplet is a single self-contained /index.html, so the build must emit index.html at the outDir root.`,
    );
  }

  const html = fs.readFileSync(indexPath, 'utf-8');
  if (state.artifactMode === 'single-file') {
    const retained = collectRetainedBuild(distPath, html, state.base);
    const files = collectRetainedFiles(distPath, retained.assets, html);
    const plan = planExternalAssets(retained);
    const report = await runOptimization(
      retained,
      files,
      state,
      optimizationServices,
      plan.triggered && plan.selected.length > 0,
    );
    state.optimizationReport = report;
    if (report.committedResourceCount > 0 && report.status !== 'rolled-back') {
      commitRetainedFiles(distPath, files, retained.emittedPaths, html);
      return report.committedResourceCount;
    }
    // Retained Vite boundaries exist only during planning. A no-op or failed
    // optimization must still leave the ordinary all-inline single-file output.
    const baseline = renderOptimizedHtml({ build: retained, selected: [] });
    files.set('index.html', Buffer.from(baseline.html));
    commitRetainedFiles(distPath, files, retained.emittedPaths, html);
  } else {
    const assets = listLocalArtifactAssets(html, distPath);
    if (assets.length > 0) {
      const list = assets.map((asset) => `  - ${asset}`).join('\n');
      console.warn(
        `[nip5a-manifest] artifactMode 'external-assets': the manifest x tag hashes only dist/index.html. These local assets are not part of the NIP-5D artifact and need rebundling before deployment:\n${list}`,
      );
    }
  }
  return 0;
}

async function runOptimization(
  retained: { html: string; assets: RetainedAsset[]; emittedPaths: string[] },
  files: Map<string, Uint8Array>,
  state: ManifestPluginState,
  injected: OptimizationServices | undefined,
  liveServicesRequired: boolean,
): Promise<OptimizationReport> {
  if (!liveServicesRequired || state.largeAssetOptimization === false) {
    return optimizeSingleFileArtifact({ build: retained, files }, unavailableOptimizationServices());
  }
  if (state.optimizationCallbackConflict) {
    console.warn('[nip5a-manifest] large-asset optimization skipped: existing experimental.renderBuiltUrl callback preserved');
    return optimizeSingleFileArtifact({ build: retained, files }, unavailableOptimizationServices());
  }
  if (injected) return await optimizeSingleFileArtifact({ build: retained, files }, injected);

  let node: import('./optimizer/node-services.js').NodeOptimizationServices | undefined;
  try {
    const { createNodeOptimizationServices } = await import('./optimizer/node-services.js');
    const configured = typeof state.largeAssetOptimization === 'object'
      ? state.largeAssetOptimization.node
      : undefined;
    node = createNodeOptimizationServices(configured);
    const services = await createLiveOptimizationServices(node);
    return await optimizeSingleFileArtifact({ build: retained, files }, services);
  } catch (error) {
    const initial = renderOptimizedHtml({ build: retained, selected: [] });
    const reason = error instanceof Error ? error.message : 'live optimization is unavailable';
    console.warn(`[nip5a-manifest] large-asset optimization skipped: ${reason}`);
    return {
      status: 'rolled-back',
      initialBytes: initial.bytes,
      finalBytes: initial.bytes,
      selected: [],
      entries: [],
      committedResourceCount: 0,
      reason,
    };
  } finally {
    await node?.dispose();
  }
}

function collectRetainedBuild(
  distPath: string,
  html: string,
  base: string,
): { html: string; assets: RetainedAsset[]; emittedPaths: string[]; artifacts: RetainedArtifact[] } {
  const rendered = renderSingleFileBuildAssets(html, distPath, base);
  if (/<link\b(?=[^>]*\brel\s*=\s*(?:"[^"]*\bmodulepreload\b[^"]*"|'[^']*\bmodulepreload\b[^']*'|modulepreload))[^>]*\bhref\s*=/i.test(rendered.html)) {
    throw new Error(
      '[nip5a-manifest] single-file artifact mode expected dist/index.html to be the only served artifact, but local external assets remain',
    );
  }
  const assets: RetainedAsset[] = [];
  const emittedPaths: string[] = [];
  const artifacts: RetainedArtifact[] = [{ path: 'index.html', kind: 'html', content: rendered.html }];
  for (const relativePath of walkDir(distPath)) {
    if (relativePath === 'index.html' || relativePath === '.nip5a-manifest.json') continue;
    const source = relativePath.split(path.sep).join('/');
    emittedPaths.push(source);
    const kind = retainedArtifactKind(source);
    if (kind) {
      artifacts.push({ path: source, kind, content: fs.readFileSync(path.join(distPath, relativePath), 'utf-8') });
    }
    const reference = findAssetReference(rendered.html, source);
    if (!reference) continue;
    assets.push({
      source,
      reference,
      bytes: fs.readFileSync(path.join(distPath, relativePath)),
      mime: mimeForPath(source),
    });
  }
  return { html: rendered.html, assets, emittedPaths, artifacts };
}

function retainedArtifactKind(filePath: string): RetainedArtifact['kind'] | null {
  if (/\.(?:m?js|cjs)$/i.test(filePath)) return 'javascript';
  if (/\.css$/i.test(filePath)) return 'stylesheet';
  return null;
}

function collectRetainedFiles(
  distPath: string,
  assets: readonly RetainedAsset[],
  html: string,
): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>([['index.html', Buffer.from(html)]]);
  for (const asset of assets) files.set(asset.source, asset.bytes);
  return files;
}

function findAssetReference(html: string, source: string): string | null {
  const fileName = path.posix.basename(source);
  const candidates = [`./${source}`, `/${source}`, source, `./${fileName}`, fileName]
    .sort((left, right) => right.length - left.length);
  return candidates.find((candidate) => html.includes(candidate)) ?? null;
}

function mimeForPath(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  const byExtension: Record<string, string> = {
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
  };
  return byExtension[extension] ?? 'application/octet-stream';
}

function unavailableOptimizationServices(): OptimizationServices {
  return {
    authorize: async () => ({ token: 'unavailable', expiresAt: Date.now() + 1 }),
    upload: async () => { throw new Error('no Blossom upload service is configured'); },
    resourceBytes: async () => { throw new Error('no NAP-RESOURCE service is configured'); },
  };
}

/** Commit the in-memory verified transaction, with a filesystem quarantine for recovery. */
function commitRetainedFiles(
  distPath: string,
  files: Map<string, Uint8Array>,
  retainedPaths: readonly string[],
  originalHtml: string,
): void {
  const indexPath = path.join(distPath, 'index.html');
  const quarantinePath = path.join(distPath, `.napplet-optimizer-${process.pid}-${Date.now()}`);
  const temporaryIndexPath = `${indexPath}.napplet-optimizer`;
  const moved: Array<{ from: string; to: string }> = [];
  try {
    fs.mkdirSync(quarantinePath, { recursive: true });
    for (const relativePath of retainedPaths) {
      const from = path.join(distPath, relativePath);
      if (!fs.existsSync(from)) continue;
      const to = path.join(quarantinePath, relativePath);
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.renameSync(from, to);
      moved.push({ from, to });
    }
    const finalHtml = files.get('index.html');
    if (!finalHtml) throw new Error('verified optimized index.html is missing');
    fs.writeFileSync(temporaryIndexPath, finalHtml);
    fs.renameSync(temporaryIndexPath, indexPath);
    if (!fs.readFileSync(indexPath).equals(Buffer.from(finalHtml)) || moved.some(({ from }) => fs.existsSync(from))) {
      throw new Error('final optimized artifact verification failed');
    }
    fs.rmSync(quarantinePath, { recursive: true, force: true });
    for (const { from } of moved) removeEmptyAssetDirectories(path.dirname(from), distPath);
  } catch (error) {
    if (fs.existsSync(temporaryIndexPath)) fs.rmSync(temporaryIndexPath, { force: true });
    fs.writeFileSync(indexPath, originalHtml);
    for (const { from, to } of moved.reverse()) {
      if (!fs.existsSync(to)) continue;
      fs.mkdirSync(path.dirname(from), { recursive: true });
      fs.renameSync(to, from);
    }
    fs.rmSync(quarantinePath, { recursive: true, force: true });
    throw error;
  }
}

function removeEmptyAssetDirectories(directory: string, root: string): void {
  try {
    while (directory !== root && directory.startsWith(`${root}${path.sep}`)) {
      if (!fs.existsSync(directory) || fs.readdirSync(directory).length !== 0) return;
      fs.rmdirSync(directory);
      directory = path.dirname(directory);
    }
  } catch {
    // Empty-directory cleanup must not roll back an already verified commit.
  }
}

function embedManifestMetadata(
  options: Nip5aManifestOptions,
  distPath: string,
  state: ManifestPluginState,
  warn: (message: string) => void,
  committedResourceCount: number,
): Omit<ManifestTemplate, 'artifactHash'> {
  const indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) throw new Error('[nip5a-manifest] dist/index.html not found; NIP-5D requires /index.html');
  const html = fs.readFileSync(indexPath, 'utf-8');
  const metadata = readPublishingMetadata(html);
  const values = (name: string): string[][] => metadata.tags.filter((tag) => tag[0] === name);
  const description = options.description ?? values('description')[0]?.[1];
  // NIP-5D §Manifest requires non-empty plain-text content.
  if (!description?.trim()) throw new Error('[nip5a-manifest] Set description or an HTML description meta for NIP-5D manifest content');
  const optional = resolvedRequirements(options.optional ?? values('O').map((t) => t[1]), state)
    .filter((name) => committedResourceCount === 0 || name !== 'resource');
  const requires = options.requires ?? values('R').map((t) => t[1]);
  reportRequirementDiagnostics(requires, state, warn, optional);
  const required = effectiveRequirements(resolvedRequirements(requires, state), committedResourceCount)
    .filter((name) => !optional.includes(name));
  const title = options.title ?? values('title')[0]?.[1];
  const icon = resolvePublishingIcon(options.icon, metadata.icons);
  const source = options.source ?? values('source')[0]?.[1];
  const manifest: Omit<ManifestTemplate, 'artifactHash'> = {
    kind: NAPPLET_KIND_NAMED,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', options.nappletType],
      ...(title ? [['title', title]] : []),
      ...(source ? [['source', source]] : []),
      ...(options.servers ?? values('server').map((t) => t[1])).map((server) => ['server', server]),
      ...(icon ? [['icon', icon.sha256, icon.mimeType]] : []),
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
  return manifest;
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
