/**
 * @napplet/sdk -- ContextVM bridge, outbox routing, upload, intent, and WebRTC
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
  JsonObject,
  CvmRegistryQuery,
  CvmRegistryOptions,
  CvmRegistryCallOptions,
  CvmRegistryEntry,
  OutboxEventOptions,
  OutboxEventResult,
  OutboxQueryOptions,
  OutboxSubscribeOptions,
  OutboxPublishOptions,
  OutboxTarget,
  OutboxRelayPlan,
  OutboxResult,
  OutboxPublishResult,
  OutboxSubscription,
  UploadInfo,
  UploadRequest,
  UploadResult,
  UploadStatus,
  IntentRequest,
  IntentResult,
  IntentAvailability,
  WebrtcOpenRequest,
  WebrtcOpenResult,
  WebrtcEvent,
} from '@napplet/core';
import { requireDomain } from './require-napplet.js';

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
    return requireDomain('cvm').discover(query);
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
    return requireDomain('cvm').request(server, message, options);
  },

  /**
   * List the tools exposed by a ContextVM server (MCP `tools/list`).
   * @param server   Target ContextVM server
   * @param options  Optional per-request options
   */
  listTools(server: CvmServerRef, options?: CvmRequestOptions): Promise<McpTool[]> {
    return requireDomain('cvm').listTools(server, options);
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
    return requireDomain('cvm').callTool(server, name, args, options);
  },

  /**
   * List the resources exposed by a ContextVM server (MCP `resources/list`).
   * @param server   Target ContextVM server
   * @param options  Optional per-request options
   */
  listResources(server: CvmServerRef, options?: CvmRequestOptions): Promise<McpResource[]> {
    return requireDomain('cvm').listResources(server, options);
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
    return requireDomain('cvm').readResource(server, uri, options);
  },

  /**
   * Close shell-maintained session state for a server.
   * @param server  Server whose session should be torn down
   */
  close(server: CvmServerRef): Promise<void> {
    return requireDomain('cvm').close(server);
  },

  /**
   * Listen for server-pushed MCP messages (`cvm.event`).
   * @param callback  Called with `(server, message)` for each server event
   * @returns A Subscription with `close()` to stop listening
   */
  onEvent(
    callback: (server: CvmServerRef, message: McpMessage) => void,
  ): Subscription {
    return requireDomain('cvm').onEvent(callback);
  },

  /** Shell-curated ContextVM registry families. */
  registry: {
    /**
     * List registry families known to the shell.
     * @param query  Optional family/search/schema filter
     */
    list(query?: CvmRegistryQuery): Promise<CvmRegistryEntry[]> {
      return requireDomain('cvm').registry.list(query);
    },

    /**
     * Test whether the shell can call a registry family.
     * @param family   Registry family name
     * @param options  Optional schema/provider constraints
     */
    has(family: string, options?: CvmRegistryOptions): Promise<boolean> {
      return requireDomain('cvm').registry.has(family, options);
    },

    /**
     * Describe the shell-selected registry family entry.
     * @param family   Registry family name
     * @param options  Optional schema/provider constraints
     */
    describe(
      family: string,
      options?: CvmRegistryOptions,
    ): Promise<CvmRegistryEntry> {
      return requireDomain('cvm').registry.describe(family, options);
    },

    /**
     * Call a tool on the shell-selected provider for a registry family.
     * @param family   Registry family name
     * @param tool     Tool name inside the family
     * @param args     Tool arguments
     * @param options  Optional schema/provider/cache/payment constraints
     */
    call(
      family: string,
      tool: string,
      args?: JsonObject,
      options?: CvmRegistryCallOptions,
    ): Promise<McpToolResult> {
      return requireDomain('cvm').registry.call(family, tool, args, options);
    },
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
 * const { events } = await outbox.query([{ authors: ['ab12...'], kinds: [1] }], {
 *   authors: ['ab12...'],
 * });
 * const sub = outbox.subscribe([{ kinds: [1] }], { timeoutMs: 3000 });
 * sub.on('event', (result) => render(result.event, result.sidecar?.relayHints));
 * ```
 */
export const outbox = {
  /**
   * Fetch one event by ID through shell-owned outbox routing.
   * @param eventId  Event id to fetch
   * @param options  Optional author/relay hints and timeout
   * @returns Promise resolving to the outbox event result
   */
  getEvent(
    eventId: string,
    options?: OutboxEventOptions,
  ): Promise<OutboxEventResult> {
    return requireDomain('outbox').getEvent(eventId, options);
  },

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
    return requireDomain('outbox').query(filters, options);
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
    return requireDomain('outbox').subscribe(filters, options);
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
    return requireDomain('outbox').publish(template, options);
  },

  /**
   * Resolve the relay plan the shell would use for a read/write target.
   * @param target  The read/write target
   * @returns Promise resolving to the relay plan
   */
  resolveRelays(target: OutboxTarget): Promise<OutboxRelayPlan> {
    return requireDomain('outbox').resolveRelays(target);
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
   * Inspect upload rails and coarse runtime policy limits.
   * @returns Promise resolving to advisory upload info.
   */
  info(): Promise<UploadInfo> {
    return requireDomain('upload').info();
  },

  /**
   * Upload bytes through the shell's storage pipeline.
   * @param request  The upload request (Blob/ArrayBuffer bytes + intent)
   * @returns Promise resolving to the initial upload result
   */
  upload(request: UploadRequest): Promise<UploadResult> {
    return requireDomain('upload').upload(request);
  },

  /**
   * Get the latest known status for a prior upload.
   * @param uploadId  The shell-generated upload id
   * @returns Promise resolving to the latest status
   */
  status(uploadId: string): Promise<UploadStatus> {
    return requireDomain('upload').status(uploadId);
  },

  /**
   * Register for shell-pushed upload status updates.
   * @param handler  Called with each new UploadStatus
   * @returns A Subscription with `close()` to stop listening
   */
  onStatus(handler: (status: UploadStatus) => void): Subscription {
    return requireDomain('upload').onStatus(handler);
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
    return requireDomain('intent').invoke(request);
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
    return requireDomain('intent').open(archetype, payload, opts);
  },

  /**
   * Check whether the runtime can currently satisfy an archetype and expose the
   * manifest-derived contracts each candidate serves.
   * @param archetype  Role slug to check
   * @returns Promise resolving to the archetype availability
   */
  available(archetype: string): Promise<IntentAvailability> {
    return requireDomain('intent').available(archetype);
  },

  /**
   * Get availability for every archetype the runtime can satisfy.
   * @returns Promise resolving to availability for each satisfiable archetype
   */
  handlers(): Promise<IntentAvailability[]> {
    return requireDomain('intent').handlers();
  },

  /**
   * Register for shell-pushed availability updates.
   * @param handler  Called with each updated IntentAvailability
   * @returns A Subscription with `close()` to stop listening
   */
  onChanged(handler: (availability: IntentAvailability) => void): Subscription {
    return requireDomain('intent').onChanged(handler);
  },
};

/**
 * Runtime-mediated WebRTC sessions (NAP-WEBRTC). The shell owns signaling,
 * signing/encryption, SDP, ICE, and peer-connection lifecycle; napplets exchange
 * only opaque application payloads over shell-scoped sessions.
 *
 * @example
 * ```ts
 * import { webrtc } from '@napplet/sdk';
 *
 * const { session } = await webrtc.open({ scope: { type: 'direct', pubkey } });
 * await webrtc.send(session.id, { body: 'hello' });
 * ```
 */
export const webrtc = {
  /**
   * Open a runtime-owned WebRTC session.
   * @param request  Session scope and channel/protocol labels
   * @returns Promise resolving to the opened session result
   */
  open(request: WebrtcOpenRequest): Promise<WebrtcOpenResult> {
    return requireDomain('webrtc').open(request);
  },

  /**
   * Send an opaque application payload over a session.
   * @param sessionId  WebRTC session id
   * @param payload    Application payload
   */
  send(sessionId: string, payload: unknown): Promise<void> {
    return requireDomain('webrtc').send(sessionId, payload);
  },

  /**
   * Close a WebRTC session.
   * @param sessionId  WebRTC session id
   * @param reason     Optional close reason
   */
  close(sessionId: string, reason?: string): Promise<void> {
    return requireDomain('webrtc').close(sessionId, reason);
  },

  /**
   * Subscribe to runtime-pushed WebRTC events.
   * @param handler  Event handler
   * @returns Subscription handle
   */
  onEvent(handler: (event: WebrtcEvent) => void): Subscription {
    return requireDomain('webrtc').onEvent(handler);
  },
};
