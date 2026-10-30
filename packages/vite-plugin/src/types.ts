/**
 * @napplet/vite-plugin — shared option, state, and protocol types.
 *
 * Internal-and-public type surface for the napplet manifest plugin. The public
 * option types (`Nip5aArtifactMode`, `Nip5aManifestOptions`) and the
 * NIP-5D kind constants are re-exported from `index.ts`; the
 * `ManifestPluginState` / `ManifestTemplate` shapes are internal plumbing
 * shared between the orchestrator and the manifest builder.
 *
 * @module
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
/** Snapshot napplet manifest kind. Declared for tooling that reads existing manifests. */
export const NAPPLET_KIND_SNAPSHOT = 5129;
/** Root napplet manifest kind. Declared for tooling that reads existing manifests. */
export const NAPPLET_KIND_ROOT = 15129;
/** Named napplet manifest kind emitted by this plugin. */
export const NAPPLET_KIND_NAMED = 35129;

/** Configuration options for the NIP-5A manifest plugin. */
export type Nip5aArtifactMode = 'external-assets' | 'single-file';

/** Requirement inference and explicit-domain options. */
export interface Nip5aRequiresOptions {
  /** Infer required NAP domains from static source usage. */
  infer?: boolean;
  /** Explicit NAP domains to emit alongside inferred domains. */
  explicit?: string[];
  /** Diagnostic mode for missing explicit declarations. */
  mode?: 'warn' | 'error';
}

/** Supported forms for the `requires` plugin option. */
export type Nip5aRequiresOption = string[] | Nip5aRequiresOptions;

/** Image formats a NIP-5D client decodes for icons and screenshots. */
export type Nip5aImageMimeType = 'image/png' | 'image/jpeg' | 'image/webp';

/**
 * One `screenshot` tag (NIP-5D §Presentation media). Supply `data` to hash, size
 * and measure the bytes and write them beside `index.html`; or supply `sha256`
 * for a blob uploaded separately. Declared fields must agree with the bytes.
 */
export interface Nip5aScreenshotOption {
  /** Complete PNG, JPEG or WebP bytes. */
  data?: Uint8Array;
  /** Lowercase-hex sha256 of the complete bytes; derived from `data`. */
  sha256?: string;
  /** NIP-94 `m`; sniffed from `data`. */
  mimeType?: Nip5aImageMimeType;
  /** NIP-94 `dim` as `WIDTHxHEIGHT`; read from PNG/JPEG/WebP headers in `data`. */
  dim?: string;
  /** NIP-94 `size` in bytes; derived from `data`. */
  size?: number;
  /** NIP-94 `alt` text. */
  alt?: string;
}

/** The single `preview` video tag (NIP-5D §Presentation media). */
export interface Nip5aPreviewOption extends Omit<Nip5aScreenshotOption, 'mimeType'> {
  /** Complete WebM or MP4 bytes. */
  data?: Uint8Array;
  /** NIP-94 `m`, a `video/*` type; sniffed from `data`. */
  mimeType?: string;
  /** NIP-71 `duration` in seconds. */
  duration?: number;
}

/** Independently downloadable source archive (NIP-5D §Source). */
export interface Nip5aSourceArchiveOption {
  /** Absolute HTTPS URL without credentials or a fragment. */
  url: string;
  /** Lowercase-hex sha256 of the archive bytes before decompression. */
  sha256: string;
  /** Archive MIME type. */
  mimeType: string;
}

/** Public configuration for {@link import('./index.js').nip5aManifest}. */
export interface Nip5aManifestOptions {
  /** Napplet type/dtag identifier (e.g., 'feed', 'chat'). Used as the NIP-5D `d` tag. */
  nappletType: string;
  /** NAP domains this napplet requires, optionally inferred from source usage. */
  requires?: Nip5aRequiresOption;
  /** Optional NAP integrations, emitted as O tags and excluded from inferred requirements. */
  optional?: string[];
  /** Accepted queryless intent identities and advertised parameter names. */
  intents?: Array<{ intent: string; params?: string[] }>;
  /** Source repository or archive location (NIP-5D §Source). */
  source?: string;
  /** Full lowercase-hex Git commit ID pinning `source`; ignored by clients without a repository source. */
  sourceCommit?: string;
  /** Independently downloadable source archive. */
  sourceArchive?: Nip5aSourceArchiveOption;
  /** Blossom origins holding the artifact, icon and presentation blobs. */
  servers?: string[];
  /** Icon bytes are embedded for standalone recovery; hash-only callers upload the blob separately. */
  icon?: { sha256?: string; data?: Uint8Array; mimeType: Nip5aImageMimeType };
  /** Screenshot tags in display order; supplied bytes are written to `dist/<sha256>.<ext>`. */
  screenshots?: Nip5aScreenshotOption[];
  /** At most one preview video; supplied bytes are written to `dist/<sha256>.<ext>`. */
  preview?: Nip5aPreviewOption;
  /** Display label; also overrides the ordinary HTML title. */
  title?: string;
  /** Plain-text manifest content, falling back to ordinary HTML description metadata. */
  description?: string;
  /** Defaults to single-file: inline JS/CSS before hashing the final index.html bytes. */
  artifactMode?: Nip5aArtifactMode;
  /** NAP-CONFIG schema or project-relative path; otherwise discover config.schema.json or napplet.config.*. */
  configSchema?: NappletConfigSchema | string;
  /** Authoring alias for independent z roles and i intents with advertised parameter names. */
  archetypes?: Array<{ slug: string; convention: string; params?: string[] }>;
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
  reportedRequirementWarnings: Set<string>;
}

/** Internal: unsigned manifest template carrying the precomputed artifactHash. */
export interface ManifestTemplate {
  kind: typeof NAPPLET_KIND_NAMED;
  created_at: number;
  tags: string[][];
  content: string;
  artifactHash: string;
}
