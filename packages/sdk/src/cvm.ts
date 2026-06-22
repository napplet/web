/**
 * @napplet/sdk -- ContextVM bridge, outbox routing, upload, intent, and common
 * wrapper objects.
 *
 * @packageDocumentation
 */

import type {
  NostrFilter,
  Subscription,
  EventTemplate,
  CvmServerRef,
  CvmServer,
  CvmDiscoverQuery,
  CvmRequestOptions,
  McpMessage,
  McpTool,
  McpToolResult,
  McpResource,
  McpResourceContent,
  OutboxQueryOptions,
  OutboxSubscribeOptions,
  OutboxPublishOptions,
  OutboxTarget,
  OutboxRelayPlan,
  OutboxResult,
  OutboxPublishResult,
  OutboxSubscription,
  UploadRequest,
  UploadResult,
  UploadStatus,
  IntentRequest,
  IntentResult,
  IntentAvailability,
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
} from '@napplet/core';
import { requireNapplet } from './require-napplet.js';

/**
 * Native ContextVM bridge (NAP-CVM): MCP-over-Nostr access mediated by the shell.
 * The shell owns ContextVM transport, signing, encryption, correlation, policy,
 * and payment; napplets supply a server identity and the MCP operation they want.
 *
 * @example
 * ```ts
 * import { cvm } from '@napplet/sdk';
 *
 * const servers = await cvm.discover({ search: 'relay' });
 * const tools = await cvm.listTools(servers[0]);
 * const result = await cvm.callTool(servers[0], tools[0].name, {});
 * ```
 */
export const cvm = {
  /**
   * Discover public ContextVM servers known to the shell.
   * @param query  Optional discovery filter
   * @returns Promise resolving to the discovered servers
   */
  discover(query?: CvmDiscoverQuery): Promise<CvmServer[]> {
    return requireNapplet().cvm.discover(query);
  },

  /**
   * Send a raw MCP JSON-RPC message to a ContextVM server.
   * @param server   Target ContextVM server
   * @param message  MCP JSON-RPC message
   * @param options  Optional per-request options
   * @returns Promise resolving to the MCP response message
   */
  request(
    server: CvmServerRef,
    message: McpMessage,
    options?: CvmRequestOptions,
  ): Promise<McpMessage> {
    return requireNapplet().cvm.request(server, message, options);
  },

  /**
   * List the tools exposed by a ContextVM server (MCP `tools/list`).
   * @param server   Target ContextVM server
   * @param options  Optional per-request options
   */
  listTools(server: CvmServerRef, options?: CvmRequestOptions): Promise<McpTool[]> {
    return requireNapplet().cvm.listTools(server, options);
  },

  /**
   * Call a tool on a ContextVM server (MCP `tools/call`).
   * @param server   Target ContextVM server
   * @param name     Tool name
   * @param args     Tool arguments
   * @param options  Optional per-request options
   */
  callTool(
    server: CvmServerRef,
    name: string,
    args?: Record<string, unknown>,
    options?: CvmRequestOptions,
  ): Promise<McpToolResult> {
    return requireNapplet().cvm.callTool(server, name, args, options);
  },

  /**
   * List the resources exposed by a ContextVM server (MCP `resources/list`).
   * @param server   Target ContextVM server
   * @param options  Optional per-request options
   */
  listResources(server: CvmServerRef, options?: CvmRequestOptions): Promise<McpResource[]> {
    return requireNapplet().cvm.listResources(server, options);
  },

  /**
   * Read a resource from a ContextVM server (MCP `resources/read`).
   * @param server   Target ContextVM server
   * @param uri      Resource URI
   * @param options  Optional per-request options
   */
  readResource(
    server: CvmServerRef,
    uri: string,
    options?: CvmRequestOptions,
  ): Promise<McpResourceContent> {
    return requireNapplet().cvm.readResource(server, uri, options);
  },

  /**
   * Close shell-maintained session state for a server.
   * @param server  Server whose session should be torn down
   */
  close(server: CvmServerRef): Promise<void> {
    return requireNapplet().cvm.close(server);
  },

  /**
   * Listen for server-pushed MCP messages (`cvm.event`).
   * @param callback  Called with `(server, message)` for each server event
   * @returns A Subscription with `close()` to stop listening
   */
  onEvent(
    callback: (server: CvmServerRef, message: McpMessage) => void,
  ): Subscription {
    return requireNapplet().cvm.onEvent(callback);
  },
};

/**
 * Outbox-aware relay routing (NAP-OUTBOX): supply Nostr filters and intent and
 * let the shell discover the correct relays (NIP-65 write/read relays, fallbacks,
 * relay intelligence), query/deduplicate, validate signatures, and stream updates.
 * The shell owns relay discovery, routing, fallback, deduplication, signing, and
 * publish fanout.
 *
 * @example
 * ```ts
 * import { outbox } from '@napplet/sdk';
 *
 * const { events } = await outbox.query([{ authors: ['ab12...'], kinds: [1] }], { strategy: 'outbox' });
 * const sub = outbox.subscribe([{ kinds: [1] }], { live: true });
 * sub.on('event', (event, relay) => render(event, relay));
 * ```
 */
export const outbox = {
  /**
   * Perform a one-shot outbox-aware query.
   * @param filters  NIP-01 filter or filters
   * @param options  Optional query options
   * @returns Promise resolving to the outbox result
   */
  query(
    filters: NostrFilter | NostrFilter[],
    options?: OutboxQueryOptions,
  ): Promise<OutboxResult> {
    return requireNapplet().outbox.query(filters, options);
  },

  /**
   * Open a live outbox-aware subscription.
   * @param filters  NIP-01 filter or filters
   * @param options  Optional subscribe options
   * @returns An OutboxSubscription handle with `on(...)` and `close()`
   */
  subscribe(
    filters: NostrFilter | NostrFilter[],
    options?: OutboxSubscribeOptions,
  ): OutboxSubscription {
    return requireNapplet().outbox.subscribe(filters, options);
  },

  /**
   * Publish a shell-signed event using outbox-aware relay fanout.
   * @param template  Unsigned event template
   * @param options   Optional publish options
   * @returns Promise resolving to the outbox publish result
   */
  publish(
    template: EventTemplate,
    options?: OutboxPublishOptions,
  ): Promise<OutboxPublishResult> {
    return requireNapplet().outbox.publish(template, options);
  },

  /**
   * Resolve the relay plan the shell would use for a read/write target.
   * @param target  The read/write target
   * @returns Promise resolving to the relay plan
   */
  resolveRelays(target: OutboxTarget): Promise<OutboxRelayPlan> {
    return requireNapplet().outbox.resolveRelays(target);
  },
};

/**
 * Shell-mediated file/blob upload (NAP-UPLOAD): hand the shell raw bytes plus
 * upload intent; the shell selects a server, signs the rail authorization
 * (NIP-98 for NIP-96, kind 24242 for Blossom), performs the HTTP upload, and
 * returns a stable URL plus NIP-94 integrity metadata. The shell owns consent,
 * policy, server selection, and signing.
 *
 * @example
 * ```ts
 * import { upload } from '@napplet/sdk';
 *
 * const result = await upload.upload({ data: blob, filename: 'pic.png' });
 * if (result.status === 'complete') attach(result.url, result.nip94);
 * ```
 */
export const upload = {
  /**
   * Upload bytes through the shell's storage pipeline.
   * @param request  The upload request (Blob/ArrayBuffer bytes + intent)
   * @returns Promise resolving to the initial upload result
   */
  upload(request: UploadRequest): Promise<UploadResult> {
    return requireNapplet().upload.upload(request);
  },

  /**
   * Get the latest known status for a prior upload.
   * @param uploadId  The shell-generated upload id
   * @returns Promise resolving to the latest status
   */
  status(uploadId: string): Promise<UploadStatus> {
    return requireNapplet().upload.status(uploadId);
  },

  /**
   * Register for shell-pushed upload status updates.
   * @param handler  Called with each new UploadStatus
   * @returns A Subscription with `close()` to stop listening
   */
  onStatus(handler: (status: UploadStatus) => void): Subscription {
    return requireNapplet().upload.onStatus(handler);
  },
};

/**
 * Archetype intent dispatch (NAP-INTENT): invoke another napplet by its role
 * without addressing it directly. The shell resolves the role to an installed
 * napplet (honoring the user's default), opens/focuses its window, and delivers
 * the payload using the named NAP-N protocol. The shell owns resolution, default
 * handling, window lifecycle, and the cross-napplet trust boundary.
 *
 * @example
 * ```ts
 * import { intent } from '@napplet/sdk';
 *
 * if ((await intent.available('note')).available) {
 *   await intent.open('note', { target: { type: 'event', id } });
 * }
 * ```
 */
export const intent = {
  /**
   * Invoke a napplet by archetype.
   * @param request  The intent request (archetype + action + payload + routing)
   * @returns Promise resolving to the invocation result
   */
  invoke(request: IntentRequest): Promise<IntentResult> {
    return requireNapplet().intent.invoke(request);
  },

  /**
   * Open a napplet by archetype (sugar for `action: "open"`).
   * @param archetype  Role slug to open
   * @param payload    Opaque payload (typed by the resolved protocol)
   * @param opts       Extra request fields (protocol, handler, behavior)
   * @returns Promise resolving to the invocation result
   */
  open(
    archetype: string,
    payload?: unknown,
    opts?: Omit<IntentRequest, 'archetype' | 'action' | 'payload'>,
  ): Promise<IntentResult> {
    return requireNapplet().intent.open(archetype, payload, opts);
  },

  /**
   * Check whether the runtime can currently satisfy an archetype.
   * @param archetype  Role slug to check
   * @returns Promise resolving to the archetype availability
   */
  available(archetype: string): Promise<IntentAvailability> {
    return requireNapplet().intent.available(archetype);
  },

  /**
   * Get availability for every archetype the runtime can satisfy.
   * @returns Promise resolving to availability for each satisfiable archetype
   */
  handlers(): Promise<IntentAvailability[]> {
    return requireNapplet().intent.handlers();
  },

  /**
   * Register for shell-pushed availability updates.
   * @param handler  Called with each updated IntentAvailability
   * @returns A Subscription with `close()` to stop listening
   */
  onChanged(handler: (availability: IntentAvailability) => void): Subscription {
    return requireNapplet().intent.onChanged(handler);
  },
};

/**
 * Common social actions (NAP-COMMON): shell-mediated public NIP-19 helpers,
 * profile lookup, follows, follow/unfollow, reactions, and reports. The shell
 * owns identity, consent, event construction, signing, publishing, relay access,
 * and NIP-19 handling.
 *
 * @example
 * ```ts
 * import { common } from '@napplet/sdk';
 *
 * const { pubkeys } = await common.follows();
 * await common.react(noteId, '+');
 * ```
 */
export const common = {
  /**
   * Encode a supported public NIP-19 value.
   * @param input  Structured NIP-19 encode input
   * @returns Promise resolving to the shell encode result
   */
  encodeNip19(input: CommonNip19EncodeInput): Promise<CommonNip19EncodeResult> {
    return requireNapplet().common.encodeNip19(input);
  },

  /**
   * Decode a supported public NIP-19 value.
   * @param value  NIP-19 value to decode
   * @returns Promise resolving to normalized decoded fields
   */
  decodeNip19(value: string): Promise<CommonNip19DecodeResult> {
    return requireNapplet().common.decodeNip19(value);
  },

  /**
   * Resolve a profile by hex pubkey, npub, or nprofile.
   * @param target  Profile target
   * @returns Promise resolving to latest profile data when available
   */
  getProfile(target: CommonProfileTarget): Promise<CommonProfileResult> {
    return requireNapplet().common.getProfile(target);
  },

  /**
   * Return the shell user's followed pubkeys as hex.
   * @returns Promise resolving to followed pubkeys
   */
  follows(): Promise<CommonFollowsResult> {
    return requireNapplet().common.follows();
  },

  /**
   * Ask the shell to follow one or more npub targets.
   * @param pubkeys  Npub targets to follow
   * @returns Promise resolving to the action result
   */
  follow(...pubkeys: string[]): Promise<CommonActionResult> {
    return requireNapplet().common.follow(...pubkeys);
  },

  /**
   * Ask the shell to unfollow one or more npub targets.
   * @param pubkeys  Npub targets to unfollow
   * @returns Promise resolving to the action result
   */
  unfollow(...pubkeys: string[]): Promise<CommonActionResult> {
    return requireNapplet().common.unfollow(...pubkeys);
  },

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
  ): Promise<CommonActionResult> {
    return requireNapplet().common.react(targetEventId, reaction, customEmojiHref);
  },

  /**
   * Report an event or pubkey with a NIP-56 reason.
   * @param target  Structured report target
   * @param reason  NIP-56 report reason
   * @param text    Report text
   * @returns Promise resolving to the action result
   */
  report(
    target: CommonReportTarget,
    reason: CommonReportReason,
    text: string,
  ): Promise<CommonActionResult> {
    return requireNapplet().common.report(target, reason, text);
  },
};
