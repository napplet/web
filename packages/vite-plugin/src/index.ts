/**
 * Vite plugin for napplet local development and manifest test artifacts.
 *
 * Install it as a development dependency in a napplet project:
 *
 * ```sh
 * pnpm add -D @napplet/vite-plugin
 * ```
 *
 * Then add the plugin to `vite.config.ts`:
 *
 * ```ts
 * import { defineConfig } from "vite";
 * import { nip5aManifest } from "@napplet/vite-plugin";
 *
 * export default defineConfig({
 *   plugins: [
 *     nip5aManifest({
 *       nappletType: "feed",
 *       requires: ["outbox", "storage"],
 *       artifactMode: "single-file",
 *     }),
 *   ],
 * });
 * ```
 *
 * During dev, the plugin injects napplet metadata tags so local shells can
 * identify the napplet type and declared requirements. During build it can:
 *
 * - rewrite local JS/CSS assets into `index.html` for single-file artifacts
 * - compute per-file SHA-256 hashes and the NIP-5A aggregate hash
 * - write `.nip5a-manifest.json` containing a signed NIP-5D kind 35129 manifest
 * - inject optional title, description, required-domain, config-schema, and
 *   archetype metadata from plugin options
 *
 * Set `VITE_DEV_PRIVKEY_HEX` to a hex-encoded 32-byte private key when you want
 * the build-time manifest signed. Without it, manifest signing is skipped while
 * the requested artifact rewrites still run.
 *
 * This plugin is a local development and verification tool. Production deploy
 * flows should use a deploy tool that publishes the built artifact and signed
 * manifest to the target storage and relays.
 *
 * @packageDocumentation
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
