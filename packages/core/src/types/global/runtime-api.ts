import type { Subscription } from '../nostr.js';

/**
 * Read-only user identity queries: public key, profile, follows, relays,
 * lists, zaps, mutes, blocked, badges. All queries are strictly read-only --
 * no signing, encryption, or decryption.
 *
 * @example
 * ```ts
 * // Get the user's public key:
 * const pubkey = await window.napplet.identity.getPublicKey();
 *
 * // Get profile metadata:
 * const profile = await window.napplet.identity.getProfile();
 * if (profile) console.log(profile.name);
 *
 * // Get follow list:
 * const follows = await window.napplet.identity.getFollows();
 * ```
 */
export interface IdentityApi {
  /** Get the user's hex-encoded public key. Always succeeds. */
  getPublicKey(): Promise<string>;
  /**
   * Listen for shell-pushed user identity changes.
   * The callback receives a hex pubkey, or "" when no user/signer is connected.
   */
  onChanged(handler: (pubkey: string) => void): Subscription;
  /** Get the user's relay list (NIP-65). */
  getRelays(): Promise<Record<string, { read: boolean; write: boolean }>>;
  /** Get the user's profile metadata (kind 0). Returns null if not found. */
  getProfile(): Promise<{
    name?: string;
    displayName?: string;
    about?: string;
    picture?: string;
    banner?: string;
    nip05?: string;
    lud16?: string;
    website?: string;
  } | null>;
  /** Get the user's follow list (kind 3 contact list). */
  getFollows(): Promise<string[]>;
  /** Get entries from a user's categorized list. */
  getList(listType: string): Promise<string[]>;
  /** Get zap receipts sent to the user. */
  getZaps(): Promise<{
    eventId: string;
    sender: string;
    amount: number;
    content?: string;
  }[]>;
  /** Get the user's mute list (kind 10000). */
  getMutes(): Promise<string[]>;
  /** Get the user's block list. */
  getBlocked(): Promise<string[]>;
  /** Get badges awarded to the user (NIP-58). */
  getBadges(): Promise<{
    id: string;
    name?: string;
    description?: string;
    image?: string;
    thumbs?: string[];
    awardedBy: string;
  }[]>;
}

/**
 * Read-only access to the shell's active theme (NAP-THEME).
 *
 * The shell owns theming; napplets read the current theme and react to
 * shell-pushed changes. The payload carries required colors plus optional
 * fonts, background media, and a title.
 *
 * @example
 * ```ts
 * const theme = await window.napplet.theme.get();
 * document.body.style.background = theme.colors.background;
 * const sub = window.napplet.theme.onChanged((t) => applyTheme(t));
 * ```
 */
export interface ThemeApi {
  /** Get the shell's current active theme. */
  get(): Promise<{
    colors: { background: string; text: string; primary: string };
    fonts?: {
      body?: { name: string; url: string };
      title?: { name: string; url: string };
    };
    background?: { url: string; mode: string; mime: string };
    title?: string;
  }>;
  /** Listen for shell-pushed theme changes. */
  onChanged(
    handler: (theme: {
      colors: { background: string; text: string; primary: string };
      fonts?: {
        body?: { name: string; url: string };
        title?: { name: string; url: string };
      };
      background?: { url: string; mode: string; mime: string };
      title?: string;
    }) => void,
  ): Subscription;
}

/**
 * Per-napplet declarative configuration (NAP-CONFIG).
 *
 * Napplet declares a JSON Schema (typically at build time via
 * @napplet/vite-plugin's `configSchema` option, or at runtime via
 * `registerSchema`); shell renders the settings UI, validates values,
 * persists them scoped by `(dTag, aggregateHash)`, and delivers live
 * values via initial snapshot + push. Shell is the sole writer.
 *
 * @example
 * ```ts
 * // Register a schema at runtime (escape hatch; prefer manifest-declared):
 * await window.napplet.config.registerSchema({
 *   type: 'object',
 *   properties: { theme: { type: 'string', enum: ['light', 'dark'], default: 'dark' } },
 * });
 *
 * // Subscribe to live values (first delivery is an immediate snapshot):
 * const sub = window.napplet.config.subscribe((values) => {
 *   applyTheme(values.theme as string);
 * });
 *
 * // Deep-link into shell-owned settings UI:
 * window.napplet.config.openSettings({ section: 'appearance' });
 * ```
 */
export interface ConfigApi {
  /**
   * Register a napplet configuration schema at runtime (runtime escape hatch).
   * Prefer manifest-declared via @napplet/vite-plugin's `configSchema` option.
   * Correlated via UUID; resolves on positive ACK, rejects with
   * `Error(code + ': ' + reason)` on shell rejection.
   * @param schema   JSON Schema (draft-07+) describing the config surface.
   * @param version  Optional `$version` migration hint.
   */
  registerSchema(
    schema: Record<string, unknown>,
    version?: number,
  ): Promise<void>;
  /**
   * Snapshot current validated + defaulted config values.
   * Correlated via UUID; resolves on the matching `config.values` response.
   */
  get(): Promise<Record<string, unknown>>;
  /**
   * Subscribe to live configuration updates. First delivery is an immediate
   * snapshot; subsequent deliveries fire whenever the shell commits a change.
   * Ref-counted: wire-level subscribe/unsubscribe only on 0->1 / 1->0
   * local-subscriber transitions.
   * @param callback  Invoked with the current config values on each push.
   * @returns A Subscription with `close()` to detach.
   */
  subscribe(callback: (values: Record<string, unknown>) => void): Subscription;
  /**
   * Request the shell open its settings UI for this napplet.
   * Fire-and-forget. The optional `section` deep-links to a named section
   * declared via the `x-napplet-section` extension somewhere in the schema.
   * @param options.section  Optional section name to deep-link to.
   */
  openSettings(options?: { section?: string }): void;
  /**
   * Listen for schema-registration errors pushed by the shell (manifest
   * parse failure, `no-schema`, etc.). Uncorrelated fan-out.
   * @param callback  Invoked with `{ code, error }` on each error push.
   * @returns A plain teardown function that detaches the listener.
   */
  onSchemaError(
    callback: (err: { code: string; error: string }) => void,
  ): () => void;
  /**
   * Readonly accessor for the currently-registered JSON Schema.
   * Populated synchronously from the `<meta name="napplet-config-schema">`
   * manifest tag at install time, then updated on successful
   * `registerSchema` responses. `null` until a schema is registered.
   */
  readonly schema: Record<string, unknown> | null;
}

/**
 * Browser-enforced resource fetching: napplets request bytes by URL,
 * shell fetches and returns a Blob. The strict-CSP iframe sandbox
 * blocks all napplet-side network access, so this is the canonical
 * (and only) byte-fetching primitive available inside a napplet.
 *
 * URL space is scheme-pluggable: shells register handlers per scheme.
 * The four canonical v0.28.0 schemes are `data:` (decoded in-shim,
 * no round-trip), `https:` (shell-side network with policy), `blossom:`
 * (Blossom hash → bytes), and `nostr:` (NIP-19 single-hop resolution).
 *
 * @example
 * ```ts
 * // Fetch raw bytes:
 * const blob = await window.napplet.resource.bytes('https://example.com/avatar.png');
 *
 * // Get a managed object URL (revoke when done to free memory):
 * const { url, revoke } = window.napplet.resource.bytesAsObjectURL('blossom:abc123...');
 * imgEl.src = url;
 * imgEl.onload = () => revoke();
 * ```
 */
export interface ResourceApi {
  /**
   * Fetch the bytes referenced by `url` through the shell's resource pipeline.
   * The shell selects a scheme handler, applies its resource policy
   * (private-IP blocks, size caps, timeouts, MIME classification), and
   * returns the bytes as a single Blob. No streaming, no chunking.
   * @param url  URL identifying the resource (any registered scheme)
   * @returns Promise resolving to the fetched bytes as a Blob
   */
  bytes(url: string): Promise<Blob>;
  /**
   * Convenience wrapper around `bytes(url)` that returns a managed
   * object URL plus a `revoke` function. Calling `revoke()` invokes
   * `URL.revokeObjectURL` exactly once to free the underlying Blob.
   * @param url  URL identifying the resource
   * @returns Object containing the blob URL and a revoke function
   */
  bytesAsObjectURL(url: string): { url: string; revoke: () => void };
}

/**
 * User-gated direct network access: napplet declares desired `connect` origins
 * at build time via `@napplet/vite-plugin`'s `connect` option; shell prompts the
 * user at first load per `(dTag, aggregateHash)`; shell emits an explicit
 * `connect-src <origin1> <origin2> …` CSP header on approval. The browser
 * enforces network access at the CSP layer — shell has zero visibility into
 * post-grant traffic. Napplet reads its own grant state via this namespace;
 * both fields are populated synchronously at shim install from the
 * `<meta name="napplet-connect-granted">` tag injected by the shell.
 *
 * Graceful degradation: `{ granted: false, origins: [] }` when shell does not
 * advertise `nap:connect`, does not inject the meta tag, or denies the grant.
 * This object is NEVER `undefined`.
 *
 * @example
 * ```ts
 * // Check grant state before firing cross-origin fetches:
 * if (window.napplet.connect.granted) {
 *   // CSP allows connect-src to these origins:
 *   const allowed = window.napplet.connect.origins;
 *   // fetch() will succeed for allowed origins, throw CSP violations otherwise.
 *   const resp = await fetch('https://api.example.com/me');
 * }
 *
 * // Capability-check the shell for the NAP itself:
 * if (window.napplet.shell.supports('nap:connect')) { ... }
 * ```
 */
export interface ConnectApi {
  /**
   * True when the shell has granted the napplet direct network access to at
   * least one origin declared in its manifest `connect` tags. False when
   * denied, ungranted, or when the shell does not implement `nap:connect`.
   */
  readonly granted: boolean;
  /**
   * Readonly list of origins for which the shell emitted `connect-src` entries.
   * Empty when `granted` is false. Origin format matches CSP source-expression
   * rules: scheme + host + optional non-default port, no path/query/fragment,
   * lowercase host, Punycode for IDN. See NAP-CONNECT spec for normalization.
   */
  readonly origins: readonly string[];
}
