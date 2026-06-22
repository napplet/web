import type { NostrFilter, Subscription, EventTemplate } from '../nostr.js';
import type {
  CvmDiscoverQuery,
  CvmRequestOptions,
  CvmServer,
  CvmServerRef,
  McpMessage,
  McpResource,
  McpResourceContent,
  McpTool,
  McpToolResult,
} from '../cvm.js';
import type {
  OutboxPublishOptions,
  OutboxPublishResult,
  OutboxQueryOptions,
  OutboxRelayPlan,
  OutboxResult,
  OutboxSubscribeOptions,
  OutboxSubscription,
  OutboxTarget,
} from '../outbox.js';
import type { UploadRequest, UploadResult, UploadStatus } from '../upload.js';
import type { IntentAvailability, IntentRequest, IntentResult } from '../intent.js';
import type {
  CommonActionResult,
  CommonFollowsResult,
  CommonNip19DecodeResult,
  CommonNip19EncodeInput,
  CommonNip19EncodeResult,
  CommonProfileResult,
  CommonProfileTarget,
  CommonReaction,
  CommonReportReason,
  CommonReportTarget,
} from '../common.js';
import type { SerialEvent, SerialOpenRequest, SerialOpenResult } from '../serial.js';

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
export interface CvmApi {
  /**
   * Discover public ContextVM servers known to the shell.
   * @param query  Optional discovery filter (search, kinds, relays, limit)
   * @returns Promise resolving to the discovered servers
   */
  discover(query?: CvmDiscoverQuery): Promise<CvmServer[]>;
  /**
   * Send a raw MCP JSON-RPC message to a ContextVM server and resolve with the
   * matching MCP response. The shell wraps the message in ContextVM transport.
   * @param server   Target ContextVM server
   * @param message  MCP JSON-RPC message to deliver
   * @param options  Optional per-request options
   * @returns Promise resolving to the MCP response message
   */
  request(server: CvmServerRef, message: McpMessage, options?: CvmRequestOptions): Promise<McpMessage>;
  /**
   * List the tools exposed by a ContextVM server (MCP `tools/list`).
   * @param server   Target ContextVM server
   * @param options  Optional per-request options
   */
  listTools(server: CvmServerRef, options?: CvmRequestOptions): Promise<McpTool[]>;
  /**
   * Call a tool on a ContextVM server (MCP `tools/call`).
   * @param server   Target ContextVM server
   * @param name     Tool name
   * @param args     Tool arguments
   * @param options  Optional per-request options
   */
  callTool(server: CvmServerRef, name: string, args?: Record<string, unknown>, options?: CvmRequestOptions): Promise<McpToolResult>;
  /**
   * List the resources exposed by a ContextVM server (MCP `resources/list`).
   * @param server   Target ContextVM server
   * @param options  Optional per-request options
   */
  listResources(server: CvmServerRef, options?: CvmRequestOptions): Promise<McpResource[]>;
  /**
   * Read a resource from a ContextVM server (MCP `resources/read`).
   * Resolves with the first content entry per the NAP-CVM API surface.
   * @param server   Target ContextVM server
   * @param uri      Resource URI
   * @param options  Optional per-request options
   */
  readResource(server: CvmServerRef, uri: string, options?: CvmRequestOptions): Promise<McpResourceContent>;
  /**
   * Close shell-maintained session state for a server (subscriptions, cached
   * initialization state, pending correlation records).
   * @param server  Server whose session should be torn down
   */
  close(server: CvmServerRef): Promise<void>;
  /**
   * Listen for server-pushed MCP messages (`cvm.event`) -- notifications and
   * unsolicited server messages not correlated to a single request.
   * @param callback  Called with `(server, message)` for each server event
   * @returns A Subscription with `close()` to stop listening
   */
  onEvent(callback: (server: CvmServerRef, message: McpMessage) => void): Subscription;
}

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
export interface OutboxApi {
  /**
   * Perform a one-shot outbox-aware query. The shell resolves relays, queries
   * them, deduplicates by event id, and validates signatures. Partial results
   * carry `incomplete: true`; a query-level failure arrives as inline `error`.
   * @param filters  NIP-01 filter or filters
   * @param options  Optional query options (authors, relays, strategy, limit, timeoutMs)
   * @returns Promise resolving to the outbox result
   */
  query(filters: NostrFilter | NostrFilter[], options?: OutboxQueryOptions): Promise<OutboxResult>;
  /**
   * Open a live outbox-aware subscription. The shell may add/remove relay
   * connections as NIP-65 relay lists change.
   * @param filters  NIP-01 filter or filters
   * @param options  Optional subscribe options (adds `live`)
   * @returns An OutboxSubscription handle with `on(...)` and `close()`
   */
  subscribe(filters: NostrFilter | NostrFilter[], options?: OutboxSubscribeOptions): OutboxSubscription;
  /**
   * Publish a shell-signed event using outbox-aware relay fanout.
   * @param template  Unsigned event template; the shell signs before fanout
   * @param options   Optional publish options (relays, targetAuthors, strategy)
   * @returns Promise resolving to the outbox publish result
   */
  publish(template: EventTemplate, options?: OutboxPublishOptions): Promise<OutboxPublishResult>;
  /**
   * Resolve the relay plan the shell would use for a read/write target.
   * Useful for diagnostics/UI; prefer query/subscribe/publish for access.
   * @param target  The read/write target (authors/pubkey, direction, strategy)
   * @returns Promise resolving to the relay plan
   */
  resolveRelays(target: OutboxTarget): Promise<OutboxRelayPlan>;
}

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
export interface UploadApi {
  /**
   * Upload bytes. The shell handles consent, server selection, rail auth
   * signing, and the HTTP upload, then resolves with the initial result.
   * Large/async uploads resolve with `status: "uploading"` and report progress
   * via `onStatus`. Resolves with the result even on `ok: false`
   * (created-then-failed/cancelled); rejects only on a top-level error.
   * @param request  The upload request (Blob/ArrayBuffer bytes + intent)
   * @returns Promise resolving to the initial upload result
   */
  upload(request: UploadRequest): Promise<UploadResult>;
  /**
   * Get the latest known status for a prior upload, including progress counters.
   * @param uploadId  The shell-generated id from a prior upload
   * @returns Promise resolving to the latest status
   */
  status(uploadId: string): Promise<UploadStatus>;
  /**
   * Register for shell-pushed status updates (progress, complete/failed).
   * @param handler  Called with each new UploadStatus
   * @returns A Subscription with `close()` to stop listening
   */
  onStatus(handler: (status: UploadStatus) => void): Subscription;
}

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
export interface IntentApi {
  /**
   * Dispatch an action (default `open`) to a napplet of `request.archetype`.
   * Resolves with the structured result (including `ok: false`/`handled: false`
   * on failure); rejects only on a top-level error.
   * @param request  The intent request (archetype + action + payload + routing)
   * @returns Promise resolving to the invocation result
   */
  invoke(request: IntentRequest): Promise<IntentResult>;
  /**
   * Convenience sugar for `invoke({ archetype, action: 'open', payload, ...opts })`.
   * @param archetype  Role slug to open
   * @param payload    Opaque payload (typed by the resolved protocol)
   * @param opts       Extra request fields (protocol, handler, behavior)
   * @returns Promise resolving to the invocation result
   */
  open(archetype: string, payload?: unknown, opts?: Omit<IntentRequest, 'archetype' | 'action' | 'payload'>): Promise<IntentResult>;
  /**
   * Whether the runtime can currently satisfy `archetype`, with candidates and
   * the actions/protocols each supports. Sourced from the installed catalog.
   * @param archetype  Role slug to check
   * @returns Promise resolving to the archetype availability
   */
  available(archetype: string): Promise<IntentAvailability>;
  /**
   * Availability for every archetype the runtime can currently satisfy.
   * @returns Promise resolving to availability for each satisfiable archetype
   */
  handlers(): Promise<IntentAvailability[]>;
  /**
   * Register for shell-pushed availability updates (install/remove/default change).
   * @param handler  Called with each updated IntentAvailability
   * @returns A Subscription with `close()` to stop listening
   */
  onChanged(handler: (availability: IntentAvailability) => void): Subscription;
}

/**
 * Common social actions (NAP-COMMON): shell-mediated NIP-19 helpers, profile
 * lookup, follows, and signed social actions. The shell owns identity, consent,
 * event construction, signing, publishing, relay access, and NIP-19 handling.
 *
 * @example
 * ```ts
 * if (window.napplet.shell.supports('common')) {
 *   const { pubkeys } = await window.napplet.common.follows();
 *   await window.napplet.common.react(noteId, '+');
 * }
 * ```
 */
export interface CommonApi {
  /**
   * Encode a supported public NIP-19 value. `nsec` is intentionally unsupported.
   * @param input  Structured NIP-19 encode input
   * @returns Promise resolving to the shell encode result
   */
  encodeNip19(input: CommonNip19EncodeInput): Promise<CommonNip19EncodeResult>;
  /**
   * Decode a supported public NIP-19 value. `nsec` is intentionally unsupported.
   * @param value  NIP-19 value to decode
   * @returns Promise resolving to normalized decoded fields
   */
  decodeNip19(value: string): Promise<CommonNip19DecodeResult>;
  /**
   * Resolve a profile by hex pubkey, npub, or nprofile.
   * @param target  Profile target
   * @returns Promise resolving to latest profile data when available
   */
  getProfile(target: CommonProfileTarget): Promise<CommonProfileResult>;
  /**
   * Return the shell user's followed pubkeys as hex.
   * @returns Promise resolving to followed pubkeys
   */
  follows(): Promise<CommonFollowsResult>;
  /**
   * Ask the shell to follow one or more npub targets.
   * @param pubkeys  Npub targets to follow
   * @returns Promise resolving to the action result
   */
  follow(...pubkeys: string[]): Promise<CommonActionResult>;
  /**
   * Ask the shell to unfollow one or more npub targets.
   * @param pubkeys  Npub targets to unfollow
   * @returns Promise resolving to the action result
   */
  unfollow(...pubkeys: string[]): Promise<CommonActionResult>;
  /**
   * React to a native Nostr event.
   * @param targetEventId     Event id to react to
   * @param reaction          Reaction content
   * @param customEmojiHref   Optional custom emoji URL
   * @returns Promise resolving to the action result
   */
  react(
    targetEventId: string,
    reaction: CommonReaction,
    customEmojiHref?: string,
  ): Promise<CommonActionResult>;
  /**
   * Report an event or pubkey with a NIP-56 reason.
   * @param target  Structured report target
   * @param reason  NIP-56 report reason
   * @param text    User-visible report text
   * @returns Promise resolving to the action result
   */
  report(
    target: CommonReportTarget,
    reason: CommonReportReason,
    text: string,
  ): Promise<CommonActionResult>;
}

/**
 * Runtime-mediated serial device access (NAP-SERIAL): the napplet asks the shell
 * to select and open a user-approved serial session, writes byte arrays to that
 * session, and receives shell-pushed state/data/close events. The shell owns
 * device selection, permissions, raw port handles, streams, OS paths, read loops,
 * and lifecycle policy.
 *
 * @example
 * ```ts
 * if (window.napplet.shell.supports('serial')) {
 *   const { session } = await window.napplet.serial.open({ options: { baudRate: 115200 } });
 *   await window.napplet.serial.write(session.id, [112, 105, 110, 103, 10]);
 * }
 * ```
 */
export interface SerialApi {
  /**
   * Ask the runtime to select and open a serial session.
   * @param request  Filters, options, and optional chooser label
   * @returns Promise resolving to the runtime-assigned serial open result
   */
  open(request: SerialOpenRequest): Promise<SerialOpenResult>;
  /**
   * Write bytes to an open serial session.
   * @param sessionId  Runtime-assigned serial session id
   * @param data       Byte values to write
   * @returns Promise resolving after the runtime acknowledges the write
   */
  write(sessionId: string, data: Uint8Array | number[]): Promise<void>;
  /**
   * Close an open serial session.
   * @param sessionId  Runtime-assigned serial session id
   * @param reason     Optional reason for the close request
   * @returns Promise resolving after the runtime acknowledges the close
   */
  close(sessionId: string, reason?: string): Promise<void>;
  /**
   * Register for shell-pushed serial events.
   * @param handler  Called with each serial event
   * @returns A Subscription with `close()` to stop listening
   */
  onEvent(handler: (event: SerialEvent) => void): Subscription;
}
