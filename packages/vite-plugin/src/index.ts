/**
 * Napplet Vite plugin for manifest generation.
 *
 * - transformIndexHtml: injects napplet-type (+ optional requires / config-schema)
 *   meta tags. No aggregate-hash meta — a file cannot contain a hash that covers
 *   itself.
 * - closeBundle (build only): walks dist/, computes per-file SHA-256 hashes,
 *   computes the NIP-5A aggregate hash, signs a NIP-5D kind 35129 napplet
 *   manifest event (NIP-5A tag schema: `path` tags + one aggregate `x` tag), and
 *   writes it to dist/.nip5a-manifest.json. The aggregate hash lives only in that
 *   external manifest, never back in index.html.
 *
 * Config:
 *   VITE_DEV_PRIVKEY_HEX — hex-encoded 32-byte private key for signing manifests.
 *   If not set, manifest generation is skipped; explicit artifact rewrites
 *   still run so local build shape matches the requested contract.
 *
 * This file is the package's public entry. Implementation is split across
 * sibling modules (`types.ts`, `hashing.ts`, `config-schema.ts`, `html.ts`,
 * `manifest.ts`); this module orchestrates them into the Vite `Plugin` and
 * re-exports the stable public API.
 *
 * @module
 */

import type { Plugin, IndexHtmlTransformResult } from 'vite';
import type { ManifestPluginState, Nip5aManifestOptions } from './types.js';
import { applyHtmlMetadata, singleFileBuildConfig } from './html.js';
import {
  buildIndexHtmlTags,
  resolvePluginConfig,
  writeBundleManifest,
} from './manifest.js';
import {
  addInferredRequirements,
  inferRequirementsFromSource,
  reportRequirementDiagnostics,
} from './requirements.js';

export { NAPPLET_KIND_NAMED, NAPPLET_KIND_ROOT, NAPPLET_KIND_SNAPSHOT } from './types.js';
export type { Nip5aArtifactMode, Nip5aManifestOptions, Nip5aRequiresOptions } from './types.js';

/**
 * Create the NIP-5A manifest Vite plugin.
 *
 * @param options - manifest options (napplet type, requires, artifact mode,
 *                   config schema).
 * @returns A Vite {@link Plugin} that injects napplet meta tags in dev and
 *          generates the signed NIP-5A manifest at build time.
 * @example
 * import { nip5aManifest } from '@napplet/vite-plugin';
 *
 * export default {
 *   plugins: [nip5aManifest({ nappletType: 'feed' })],
 * };
 */
export function nip5aManifest(options: Nip5aManifestOptions): Plugin {
  const state: ManifestPluginState = {
    outDir: 'dist',
    projectRoot: process.cwd(),
    base: '/',
    artifactMode: options.artifactMode ?? 'external-assets',
    resolvedSchema: null,
    resolvedSchemaSource: null,
    inferredRequires: new Set(),
    reportedMissingRequires: new Set(),
  };

  return {
    name: 'vite-plugin-nip5a-manifest',

    config(config) {
      if (state.artifactMode !== 'single-file') return undefined;
      return singleFileBuildConfig(config);
    },

    async configResolved(config) {
      await resolvePluginConfig(options, state, config);
    },

    transform(code: string, id: string) {
      addInferredRequirements(state, inferRequirementsFromSource(code, id));
      reportRequirementDiagnostics(options.requires, state, (message) => this.warn(message));
      return null;
    },

    transformIndexHtml(html: string, ctx?: { server?: unknown }): IndexHtmlTransformResult {
      const tags = buildIndexHtmlTags(options, state, !!ctx?.server);
      // When title/description are set they must OVERRIDE any existing
      // `<title>` / description meta — Vite tag descriptors only append, so we
      // return the html-string transform form to rewrite the document in place.
      if (options.title !== undefined || options.description !== undefined) {
        return {
          html: applyHtmlMetadata(html, { title: options.title, description: options.description }),
          tags,
        };
      }
      return tags;
    },

    async closeBundle() {
      reportRequirementDiagnostics(options.requires, state, (message) => this.warn(message));
      await writeBundleManifest(options, state);
    },
  };
}
