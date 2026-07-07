/**
 * @napplet/vite-plugin — shared option, state, and protocol types.
 *
 * Internal-and-public type surface for the napplet manifest plugin. The public
 * option types (`Nip5aArtifactMode`, `Nip5aManifestOptions`) and the
 * NIP-5D kind constants are re-exported from `index.ts`; the
 * `ManifestPluginState` / `ManifestTemplate` shapes are internal plumbing
 * shared between the orchestrator and the manifest builder.
 */

import type { NappletConfigSchema } from '@napplet/nap/config/types';

/**
 * NIP-5D napplet manifest kinds. Deliberately distinct from NIP-5A's nsite
 * kinds (`5128` / `15128` / `35128`) so napplets stay out of nsite gateway
 * resolution — a napplet is resolved and verified by the napplet runtime,
 * never served as an nsite (NIP-5D §Manifest).
 *
 * This plugin always emits a `d` tag (`nappletType` is required), so every
 * build is a **named** napplet (`35129`). The root (`15129`) and snapshot
 * (`5129`) kinds are declared here for completeness but are not produced by
 * this typed-build plugin — there is no root-napplet build mode.
 */
export const NAPPLET_KIND_SNAPSHOT = 5129;
export const NAPPLET_KIND_ROOT = 15129;
export const NAPPLET_KIND_NAMED = 35129;

/** Configuration options for the NIP-5A manifest plugin. */
export type Nip5aArtifactMode = 'external-assets' | 'single-file';

/** One NAAT archetype contract emitted as an `archetype` manifest tag. */
export interface Nip5aArchetypeContract {
  protocol: string;
  eventKinds?: number[];
}

export interface Nip5aRequiresOptions {
  infer?: boolean;
  explicit?: string[];
  mode?: 'warn' | 'error';
}

export type Nip5aRequiresOption = string[] | Nip5aRequiresOptions;

export interface Nip5aManifestOptions {
  /** Napplet type/dtag identifier (e.g., 'feed', 'chat'). Used as the NIP-5A 'd' tag and injected as napplet-type meta attribute. */
  nappletType: string;
  /** NAP domains this napplet requires, optionally inferred from source usage. */
  requires?: Nip5aRequiresOption;
  /**
   * Human-readable napplet title. When set, the plugin sets/overrides the built
   * HTML `<title>` element (inserting one after `<head>` if absent). This is
   * PLAIN HTML — NOT a `napplet-*` protocol meta tag. When omitted, the author's
   * existing `<title>` is left untouched.
   *
   * The napplet CLI reads this back out of the built `index.html` at deploy time
   * and emits it as the NIP-5A `["title", ...]` manifest tag.
   */
  title?: string;
  /**
   * Human-readable napplet description. When set, the plugin sets/overrides the
   * built HTML `<meta name="description">` element (inserting one after `<head>`
   * if absent). This is PLAIN HTML — NOT a `napplet-*` protocol meta tag. When
   * omitted, the author's existing description meta is left untouched.
   *
   * The napplet CLI reads this back out of the built `index.html` at deploy time
   * and emits it as the NIP-5A `["description", ...]` manifest tag.
   */
  description?: string;
  /**
   * Artifact output contract for production builds.
   *
   * - `external-assets` (default): preserves Vite's normal HTML + JS/CSS asset
   *   graph and rejects inline executable scripts.
   * - `single-file`: rewrites local build JS/CSS references into `index.html`
   *   before aggregateHash/manifest generation, then accepts those
   *   build-produced inline scripts as the explicit NIP-5A gateway artifact.
   */
  artifactMode?: Nip5aArtifactMode;
  /**
   * Napplet config schema (NAP-CONFIG). Either an inline JSON Schema (draft-07+)
   * object describing the napplet's settings surface, or a string path (relative
   * to the Vite project root) pointing to a JSON file to load.
   *
   * When omitted, the plugin falls back to (in order):
   * 1. `config.schema.json` at the Vite project root (convention file).
   * 2. `napplet.config.ts` / `.js` / `.mjs` exporting a `configSchema` named export.
   *
   * If no schema is found via any of these paths, the plugin emits NO config
   * tag on the NIP-5A manifest and NO `<meta name="napplet-config-schema">` tag
   * in index.html — fully backward compatible with napplets that declare no
   * config surface.
   *
   * Schemas are structurally validated at build time against the NAP-CONFIG
   * Core Subset; root must be `{ type: "object" }`; external `$ref` is forbidden;
   * `pattern` is forbidden (CVE-2025-69873 class / ReDoS); `x-napplet-secret: true`
   * combined with `default` is forbidden. Violating schemas fail the build.
   *
   * @see NAP-CONFIG spec (napplet/naps#13)
   */
  configSchema?: NappletConfigSchema | string;
  /**
   * NAAT archetype roles this napplet fulfills (napplet/naps `ARCHETYPES.md`).
   *
   * Each protocol emits one `["archetype", slug, protocol, ...constraints]`
   * NIP-5A manifest tag, where `slug` is the role slug, `protocol` is one
   * accepted NAP-N wire format, and optional `kind:<number>` constraints are
   * scoped to that protocol. A napplet may declare several archetype roles; a
   * napplet with no archetype tag is fully valid.
   *
   * Accepts the object form `{ slug, naps? }` for protocol-only contracts,
   * `{ slug, contracts? }` for per-protocol constraints, or the string shorthand
   * where `"feed"` is equivalent to `{ slug: "feed" }` (no emitted protocol
   * contract). Blank slugs and blank protocols are skipped.
   *
   * Like the `config` tag, archetype tags are excluded from the aggregate `x`
   * hash (NIP-5D §Identity: the aggregate is recomputed from `path` tags
   * alone). Non-normative summary — defer to `ARCHETYPES.md` (napplet/naps).
   */
  archetypes?: Array<string | { slug: string; naps?: string[]; contracts?: Nip5aArchetypeContract[] }>;
}

/** Internal: resolved per-plugin-instance build state shared across hooks. */
export interface ManifestPluginState {
  outDir: string;
  projectRoot: string;
  base: string;
  artifactMode: Nip5aArtifactMode;
  resolvedSchema: NappletConfigSchema | null;
  resolvedSchemaSource: string | null;
  inferredRequires: Set<string>;
  reportedMissingRequires: Set<string>;
}

/** Internal: unsigned manifest template carrying the precomputed aggregateHash. */
export interface ManifestTemplate {
  kind: typeof NAPPLET_KIND_NAMED;
  created_at: number;
  tags: string[][];
  content: '';
  aggregateHash: string;
}
