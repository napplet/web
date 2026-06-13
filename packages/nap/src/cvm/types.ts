/**
 * @napplet/nap/cvm -- ContextVM bridge message types for the JSON envelope wire protocol.
 *
 * NAP-CVM gives napplets native access to ContextVM servers through the shell.
 * ContextVM transports Model Context Protocol (MCP) JSON-RPC messages over Nostr
 * relays using public-key addressing and encrypted relay events (kind 25910).
 * The shell owns all ContextVM transport details -- relay routing, signing,
 * encryption, JSON-RPC correlation, initialization, policy, and optional payment
 * prompts. The napplet supplies a server identity and the MCP operation it wants.
 *
 * Defines 7 message types exchanged between napplet and shell:
 * - Napplet -> Shell: discover, request, close
 * - Shell -> Napplet: discover.result, request.result, close.result, event
 *
 * All types form a discriminated union on the `type` field.
 */

import type { NappletMessage } from '@napplet/core';

/** The NAP domain name for ContextVM messages. */
export const DOMAIN = 'cvm' as const;

// ─── MCP value shapes ───────────────────────────────────────────────────────
// Minimal structural mirrors of the Model Context Protocol schema. Napplets
// receive these MCP results; the shell never exposes ContextVM keys, relay
// credentials, or socket access.

/**
 * A single MCP JSON-RPC message. ContextVM stringifies this into the `content`
 * field of a Nostr event; the shell wraps and unwraps the transport for the napplet.
 *
 * The embedded `id` is the MCP/JSON-RPC correlation id and is independent of the
 * NIP-5D envelope `id` used to correlate `cvm.request` with `cvm.request.result`.
 */
export interface McpMessage {
  jsonrpc: '2.0';
  /** JSON-RPC correlation id (distinct from the NIP-5D envelope id). */
  id?: string | number;
  /** JSON-RPC method (e.g. `tools/call`); present on requests and notifications. */
  method?: string;
  /** Method parameters. */
  params?: unknown;
  /** Successful result payload (present on responses). */
  result?: unknown;
  /** Error payload (present on failed responses). */
  error?: unknown;
}

/**
 * An MCP tool definition, as returned by `tools/list`.
 */
export interface McpTool {
  /** Unique tool name used as the `tools/call` argument. */
  name: string;
  /** Human-readable description of what the tool does. */
  description?: string;
  /** JSON Schema describing the tool's input arguments. */
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * A content block inside an MCP tool result (text, image, resource, etc.).
 * The `type` discriminates the block; `text` is present for `type: "text"`.
 */
export interface McpContentBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

/**
 * The result of an MCP `tools/call`. `isError: true` signals a tool-level
 * failure whose detail lives in `content`, distinct from a JSON-RPC transport error.
 */
export interface McpToolResult {
  content: McpContentBlock[];
  isError?: boolean;
  [key: string]: unknown;
}

/**
 * An MCP resource descriptor, as returned by `resources/list`.
 */
export interface McpResource {
  /** Canonical resource URI. */
  uri: string;
  /** Programmatic resource name. */
  name: string;
  /** Optional display title. */
  title?: string;
  /** Human-readable description. */
  description?: string;
  /** Resource MIME type, when known. */
  mimeType?: string;
  /** Resource size in bytes, when known. */
  size?: number;
}

/** Text contents of an MCP resource (`resources/read`). */
export interface McpTextResourceContents {
  uri: string;
  mimeType?: string;
  text: string;
}

/** Binary contents of an MCP resource (`resources/read`); `blob` is base64-encoded. */
export interface McpBlobResourceContents {
  uri: string;
  mimeType?: string;
  /** Base64-encoded resource bytes. */
  blob: string;
}

/** A single MCP resource content entry: either text or base64 blob. */
export type McpResourceContent = McpTextResourceContents | McpBlobResourceContents;

// ─── ContextVM server references ────────────────────────────────────────────

/**
 * Identifies a ContextVM server by its Nostr public key, with optional relay hints.
 * The shell decides which relays to actually route through per its relay policy.
 */
export interface CvmServerRef {
  /** Hex-encoded Nostr public key of the ContextVM server. */
  pubkey: string;
  /** Optional relay URL hints; the shell MAY use, ignore, or augment these. */
  relays?: string[];
}

/**
 * Filter for `cvm.discover`. All fields are optional; an empty query asks the
 * shell for whatever public ContextVM server announcements it knows about.
 */
export interface CvmDiscoverQuery {
  /** Free-text search over server name/description/capabilities. */
  search?: string;
  /** Restrict to specific Nostr event kinds (announcement kinds). */
  kinds?: number[];
  /** Relay URL hints to search. */
  relays?: string[];
  /** Maximum number of servers to return. */
  limit?: number;
}

/**
 * A discovered ContextVM server announcement.
 */
export interface CvmServer extends CvmServerRef {
  /** Display name from the server announcement. */
  name?: string;
  /** Human-readable description. */
  description?: string;
  /** Advertised capability tags (e.g. MCP capabilities). */
  capabilities?: string[];
  /** Whether the server requires value exchange before serving requests. */
  paymentRequired?: boolean;
}

/**
 * Per-request options for `cvm.request` and the MCP convenience wrappers.
 */
export interface CvmRequestOptions {
  /** Wall-clock budget for the request, in milliseconds. */
  timeoutMs?: number;
  /** Ask the shell to perform MCP initialization before this request. */
  initialize?: boolean;
  /**
   * Payment posture if the server requires value exchange:
   * - `deny`   -- never pay (fail with `payment required`)
   * - `prompt` -- ask the user
   * - `allow`  -- pay within the user's explicit allowance
   */
  payment?: 'deny' | 'prompt' | 'allow';
}

// ─── Wire messages ──────────────────────────────────────────────────────────

/**
 * Base interface for all ContextVM NAP messages.
 * Concrete message types narrow the `type` field to specific literals.
 */
export interface CvmMessage extends NappletMessage {
  /** Message type in "cvm.<action>" format. */
  type: `cvm.${string}`;
}

/**
 * Discover public ContextVM servers known to the shell.
 *
 * @example
 * ```ts
 * const msg: CvmDiscoverMessage = {
 *   type: 'cvm.discover',
 *   id: crypto.randomUUID(),
 *   query: { search: 'relay', limit: 5 },
 * };
 * ```
 */
export interface CvmDiscoverMessage extends CvmMessage {
  type: 'cvm.discover';
  /** Correlation ID for this request. */
  id: string;
  /** Optional discovery filter. */
  query?: CvmDiscoverQuery;
}

/**
 * Result of a `cvm.discover` request: the servers the shell resolved.
 */
export interface CvmDiscoverResultMessage extends CvmMessage {
  type: 'cvm.discover.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Discovered ContextVM servers. */
  servers: CvmServer[];
  /** Shell/transport-level error when discovery failed. */
  error?: string;
}

/**
 * Send a raw MCP JSON-RPC message to a ContextVM server. The shell wraps the
 * MCP message in ContextVM/Nostr transport events, correlates the response,
 * verifies the server signature, and replies with `cvm.request.result`.
 *
 * @example
 * ```ts
 * const msg: CvmRequestMessage = {
 *   type: 'cvm.request',
 *   id: crypto.randomUUID(),
 *   server: { pubkey: '65a334...', relays: ['wss://relay.example.com'] },
 *   message: {
 *     jsonrpc: '2.0',
 *     id: 2,
 *     method: 'tools/call',
 *     params: { name: 'get_relay', arguments: { url: 'wss://relay.example.com' } },
 *   },
 *   options: { initialize: true, payment: 'prompt' },
 * };
 * ```
 */
export interface CvmRequestMessage extends CvmMessage {
  type: 'cvm.request';
  /** Correlation ID for this request (NIP-5D envelope id). */
  id: string;
  /** Target ContextVM server. */
  server: CvmServerRef;
  /** The MCP JSON-RPC message to deliver. */
  message: McpMessage;
  /** Optional per-request options. */
  options?: CvmRequestOptions;
}

/**
 * Result of a `cvm.request`. The embedded MCP `message` retains its own JSON-RPC
 * `id`. MCP-level errors arrive inside `message.error`; transport or shell-policy
 * failures arrive in the envelope-level `error` field.
 */
export interface CvmRequestResultMessage extends CvmMessage {
  type: 'cvm.request.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** The MCP response message, when the request completed. */
  message?: McpMessage;
  /**
   * Transport or shell-policy error, e.g. `"server not found"`, `"relay timeout"`,
   * `"initialization failed"`, `"payment required"`, `"payment denied"`,
   * `"unsupported method"`, `"policy denied"`.
   */
  error?: string;
}

/**
 * Close shell-maintained session state for a server: subscriptions, cached
 * initialization state, and pending correlation records.
 *
 * @example
 * ```ts
 * const msg: CvmCloseMessage = {
 *   type: 'cvm.close',
 *   id: crypto.randomUUID(),
 *   server: { pubkey: '65a334...' },
 * };
 * ```
 */
export interface CvmCloseMessage extends CvmMessage {
  type: 'cvm.close';
  /** Correlation ID for this request. */
  id: string;
  /** Server whose session state should be torn down. */
  server: CvmServerRef;
}

/**
 * Result of a `cvm.close` request.
 */
export interface CvmCloseResultMessage extends CvmMessage {
  type: 'cvm.close.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Error message if the close could not complete. */
  error?: string;
}

/**
 * A server-pushed MCP message not directly correlated to a single request --
 * MCP notifications (e.g. `notifications/progress`) or other server messages.
 * Carries no envelope `id`; it is delivered to all registered event listeners
 * for the originating server.
 *
 * @example
 * ```ts
 * const msg: CvmEventMessage = {
 *   type: 'cvm.event',
 *   server: { pubkey: '65a334...' },
 *   message: { jsonrpc: '2.0', method: 'notifications/progress', params: { progress: 50 } },
 * };
 * ```
 */
export interface CvmEventMessage extends CvmMessage {
  type: 'cvm.event';
  /** The server that emitted the message. */
  server: CvmServerRef;
  /** The MCP notification or unsolicited server message. */
  message: McpMessage;
}

/** Napplet -> Shell ContextVM messages. */
export type CvmOutboundMessage =
  | CvmDiscoverMessage
  | CvmRequestMessage
  | CvmCloseMessage;

/** Shell -> Napplet ContextVM messages. */
export type CvmInboundMessage =
  | CvmDiscoverResultMessage
  | CvmRequestResultMessage
  | CvmCloseResultMessage
  | CvmEventMessage;

/** All ContextVM NAP message types (discriminated union on `type` field). */
export type CvmNapMessage = CvmOutboundMessage | CvmInboundMessage;
