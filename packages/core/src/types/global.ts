import type { NappletShell } from './shell.js';
import type { RelayApi, IncApi, StorageApi, KeysApi } from './global/nostr-api.js';

export type { NappletInstanceStorage } from './global/nostr-api.js';
import type { MediaApi, NotifyApi } from './global/media-api.js';
import type {
  IdentityApi,
  ThemeApi,
  ConfigApi,
  ResourceApi,
} from './global/runtime-api.js';
import type { CvmApi, OutboxApi, UploadApi, IntentApi, LinkApi, SerialApi } from './global/service-api.js';

/**
 * The window.napplet global installed at runtime by @napplet/shim.
 *
 * The published packages avoid global `Window` type mutation for JSR
 * compatibility. Consumers that access `window.napplet` directly can use this
 * interface in a local ambient declaration or cast:
 * ```ts
 * import type { NappletGlobal } from '@napplet/core';
 * import '@napplet/shim';
 *
 * const napplet = (window as Window & { napplet: NappletGlobal }).napplet;
 * ```
 */
export interface NappletGlobal {
  /**
   * NIP-01 relay operations: subscribe to events, publish events, one-shot queries.
   * Routes through the shell's relay pool via postMessage.
   */
  relay: RelayApi;
  /**
   * Inter-napplet pubsub: broadcast and receive INC-PEER events through the shell.
   */
  inc: IncApi;
  /**
   * Napplet-scoped storage: async localStorage-like API proxied through the shell.
   * Each napplet's storage is isolated by identity — napplets cannot read each other's data.
   */
  storage: StorageApi;
  /**
   * Keyboard forwarding and action keybindings: register named actions the shell
   * can bind to keys, forward unbound keystrokes to the shell, listen for
   * shell-triggered actions locally.
   *
   * @example
   * ```ts
   * // Register an action the shell can bind to a key:
   * const result = await window.napplet.keys.registerAction({
   *   id: 'editor.save', label: 'Save', defaultKey: 'Ctrl+S',
   * });
   *
   * // Listen for the bound key locally:
   * const sub = window.napplet.keys.onAction('editor.save', () => {
   *   console.log('Save triggered!');
   * });
   *
   * // Unregister when no longer needed:
   * window.napplet.keys.unregisterAction('editor.save');
   * ```
   */
  keys: KeysApi;
  /**
   * Media session control: create sessions, report state and metadata,
   * declare capabilities, receive commands from the shell.
   *
   * @example
   * ```ts
   * // Create a media session:
   * const { sessionId } = await window.napplet.media.createSession({
   *   owner: 'napplet',
   *   metadata: { title: 'My Song', artist: 'The Artist' },
   * });
   *
   * // Report playback state:
   * window.napplet.media.reportState(sessionId, {
   *   status: 'playing', position: 42.5, duration: 240,
   * });
   *
   * // Listen for shell commands:
   * window.napplet.media.onCommand(sessionId, (action, value) => {
   *   if (action === 'pause') player.pause();
   * });
   * ```
   */
  media: MediaApi;
  /**
   * Shell-rendered notifications: send notifications, set badge counts,
   * register channels, request permission, listen for user interaction.
   *
   * @example
   * ```ts
   * // Send a notification:
   * const { notificationId } = await window.napplet.notify.send({
   *   title: 'New message', body: 'Alice: hey!', priority: 'normal',
   * });
   *
   * // Set badge count:
   * window.napplet.notify.badge(3);
   *
   * // Listen for action clicks:
   * window.napplet.notify.onAction((notificationId, actionId) => {
   *   if (actionId === 'reply') openReply(notificationId);
   * });
   * ```
   */
  notify: NotifyApi;
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
  identity: IdentityApi;
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
  theme: ThemeApi;
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
  config: ConfigApi;
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
  resource: ResourceApi;
  /**
   * Native ContextVM bridge (NAP-CVM): MCP-over-Nostr access mediated by the shell.
   *
   * ContextVM transports Model Context Protocol JSON-RPC over Nostr relays using
   * public-key server addressing and encrypted relay events. The shell owns all
   * transport details -- relay routing, signing, encryption, JSON-RPC correlation,
   * MCP initialization, per-napplet policy, and optional payment prompts. Napplets
   * supply a server identity (`pubkey` + optional relay hints) and the MCP
   * operation they want; they receive MCP results, never ContextVM private keys,
   * relay credentials, or direct socket access.
   *
   * @example
   * ```ts
   * if (window.napplet.shell.supports('cvm')) {
   *   const servers = await window.napplet.cvm.discover({ search: 'relay' });
   *   const tools = await window.napplet.cvm.listTools(servers[0]);
   *   const result = await window.napplet.cvm.callTool(servers[0], tools[0].name, {});
   * }
   * ```
   */
  cvm: CvmApi;
  /**
   * Outbox-aware relay routing (NAP-OUTBOX): the napplet supplies Nostr filters
   * and intent; the shell discovers the correct relays (NIP-65 write/read relays,
   * fallbacks, relay intelligence), queries them, deduplicates events by id,
   * validates signatures, and streams updates. The shell owns relay discovery,
   * routing, fallback, deduplication, signing, and publish fanout policy.
   *
   * Use this instead of NAP-RELAY when relay selection is part of result
   * correctness (reading an author's notes from their write relays, publishing to
   * the user's write relays, fanning a directed event to recipient inbox relays).
   *
   * @example
   * ```ts
   * if (window.napplet.shell.supports('outbox')) {
   *   const { events } = await window.napplet.outbox.query(
   *     [{ authors: ['ab12...'], kinds: [1], limit: 20 }],
   *     { strategy: 'outbox' },
   *   );
   * }
   * ```
   */
  outbox: OutboxApi;
  /**
   * Shell-mediated file/blob upload (NAP-UPLOAD): the napplet hands the shell raw
   * bytes plus upload intent; the shell selects a storage server, signs the rail
   * authorization (NIP-98 for NIP-96, kind 24242 for Blossom), performs the HTTP
   * upload, and returns a stable URL plus NIP-94 integrity metadata. The shell is
   * the policy and consent boundary; napplets never receive signing keys, server
   * credentials, or direct network access.
   *
   * @example
   * ```ts
   * if (window.napplet.shell.supports('upload')) {
   *   const result = await window.napplet.upload.upload({ data: blob, filename: 'pic.png' });
   *   if (result.status === 'complete') attach(result.url, result.nip94);
   * }
   * ```
   */
  upload: UploadApi;
  /**
   * Archetype intent dispatch (NAP-INTENT): invoke another napplet by its role
   * (archetype) without addressing it directly. The napplet names a role +
   * action + payload; the shell resolves the role to an installed napplet
   * (honoring the user's default-handler preference), creates or focuses the
   * window, and delivers the payload using the named NAP-N protocol. Routing
   * (`archetype`) and payload format (`protocol`) are orthogonal. The shell owns
   * resolution, default handling, window lifecycle, and the trust boundary —
   * napplets never learn or address other napplets except through this resolution.
   *
   * @example
   * ```ts
   * if (window.napplet.shell.supports('intent')) {
   *   const { available } = await window.napplet.intent.available('note');
   *   if (available) await window.napplet.intent.open('note', { target: { type: 'event', id } });
   * }
   * ```
   */
  intent: IntentApi;
  /**
   * Shell-mediated link opening (NAP-LINK): request user-visible navigation
   * without giving the napplet direct navigation authority, opener access,
   * network access, or fetched bytes.
   *
   * @example
   * ```ts
   * if (window.napplet.shell.supports('link')) {
   *   await window.napplet.link.open('https://example.com/post/123', { label: 'Read post' });
   * }
   * ```
  */
  link: LinkApi;
  /**
   * Runtime-mediated serial device access (NAP-SERIAL): the napplet asks the
   * shell to select and open a user-approved serial session, writes byte arrays,
   * and receives shell-pushed state/data/close events. The shell owns raw port
   * handles, streams, OS paths, permissions, read loops, and lifecycle policy.
   *
   * @example
   * ```ts
   * if (window.napplet.shell.supports('serial')) {
   *   const { session } = await window.napplet.serial.open({ options: { baudRate: 115200 } });
   *   await window.napplet.serial.write(session.id, [112, 105, 110, 103, 10]);
   * }
   * ```
   */
  serial: SerialApi;
  /**
   * NAP-SHELL: the foundational, mandatory bootstrap handshake surface.
   *
   * `shell` is the one domain that is **not** discoverable via
   * `supports()` — it is always present. The shim posts `shell.ready`, the
   * runtime replies once with `shell.init` carrying the environment, and the
   * shim caches it so `supports(domain, protocol?)` answers synchronously and
   * locally thereafter. Also exposes the runtime's `services` and
   * `ready()` / `onReady()` to gate startup.
   *
   * @example
   * ```ts
   * // Synchronous, local capability queries (no wire round-trip):
   * if (window.napplet.shell.supports('relay')) { ... }
   * if (window.napplet.shell.supports('inc', 'NAP-2')) { ... }
   *
   * // Await environment delivery, or react to it:
   * const env = await window.napplet.shell.ready();
   * const sub = window.napplet.shell.onReady((e) => start(e));
   * ```
   */
  shell: NappletShell;
}
