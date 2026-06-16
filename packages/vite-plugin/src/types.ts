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

export interface Nip5aManifestOptions {
  /** Napplet type/dtag identifier (e.g., 'feed', 'chat'). Used as the NIP-5A 'd' tag and injected as napplet-type meta attribute. */
  nappletType: string;
  /** Service dependencies this napplet requires (e.g., ['audio', 'notifications']). Optional. */
  requires?: string[];
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
   * @deprecated v0.29.0 — the shell is now the sole CSP authority. This option has NO effect
   * and will be hard-removed in a future milestone (tracked as REMOVE-STRICTCSP). The plugin emits a
   * one-shot `console.warn` per build when this field is set so existing v0.28.0 consumers
   * discover the deprecation on upgrade without their `vite.config.ts` breaking.
   *
   * Typed as `unknown` to remain assignment-compatible with the removed
   * `boolean | object` shape — any prior value parses cleanly; no branch reads it.
   */
  strictCsp?: unknown;

  /**
   * Direct-network-access origins this napplet intends to reach from the sandbox
   * (NAP-CONNECT). Each entry is an **origin** — scheme + host + optional
   * non-default port — validated against the NAP-CONNECT Origin Format rules
   * and emitted as one `['connect', <origin>]` tag per origin on the signed
   * NIP-5A manifest.
   *
   * **Origin format rules** (delegated to the shared
   * {@link normalizeConnectOrigin} validator from `@napplet/nap/connect/types`):
   * - Scheme MUST be one of `https:` / `wss:` / `http:` / `ws:` (lowercase).
   * - Host MUST be lowercase. Wildcards (`*`) are not permitted.
   * - Default ports MUST be omitted (`:443` on `https:`/`wss:`, `:80` on `http:`/`ws:`).
   * - IDN hosts MUST be Punycode-encoded before emission (`xn--` form, lowercase).
   *   IPv4 literals are accepted; IPv6 literals are out of v1 scope.
   * - Path / query / fragment MUST NOT appear.
   *
   * **Build-time behaviors:**
   * 1. Each origin is normalized through the shared validator in `configResolved`;
   *    violations throw a `[nip5a-manifest]`-prefixed error that chains the
   *    nap's diagnostic so authors see exactly which origin failed and why.
   * 2. Normalized origins are folded into `aggregateHash` via the NAP-CONNECT
   *    canonical fold (lowercase → ASCII-ascending sort → LF-join → UTF-8 →
   *    SHA-256 → lowercase hex) and pushed as the synthetic xTag entry
   *    `[<hash>, 'connect:origins']`. Any origin-list change flips
   *    `aggregateHash`, which auto-invalidates shell grants keyed on
   *    `(dTag, aggregateHash)`.
   * 3. One `['connect', <normalized-origin>]` manifest tag is emitted per
   *    origin in author-declared order, placed between `['x', ...]` tags and
   *    `['config', ...]` tags on the signed event.
   * 4. Cleartext origins (`http:` / `ws:`) trigger an informational
   *    `console.warn` describing browser mixed-content rules. Non-blocking.
   * 5. When Vite is running in dev mode (`vite serve`), an optional
   *    `<meta name="napplet-connect-requires" content="...">` tag is injected
   *    for shell-less local preview. This `requires` name is **distinct**
   *    from the shell-authoritative `...-granted` meta defined in NAP-CONNECT
   *    §Runtime API — the plugin MUST NEVER emit the `granted` variant; the
   *    shell is the sole writer of that name.
   *
   * When omitted or empty, the plugin emits no `connect` tags, performs no
   * fold, and the napplet is treated as NAP-CLASS-1 (strict / no-user-declared-
   * origins) by conformant shells.
   *
   * @see NAP-CONNECT spec — napplet/naps#NAP-CONNECT
   */
  connect?: string[];
}

/** Internal: resolved per-plugin-instance build state shared across hooks. */
export interface ManifestPluginState {
  outDir: string;
  projectRoot: string;
  base: string;
  artifactMode: Nip5aArtifactMode;
  resolvedSchema: NappletConfigSchema | null;
  resolvedSchemaSource: string | null;
  normalizedConnect: string[];
}

/** Internal: unsigned manifest template carrying the precomputed aggregateHash. */
export interface ManifestTemplate {
  kind: typeof NAPPLET_KIND_NAMED;
  created_at: number;
  tags: string[][];
  content: '';
  aggregateHash: string;
}
