import type {
  NappletMessage,
  McpToolResult,
  JsonObject,
  CvmRegistryQuery,
  CvmRegistrySelector,
  CvmRegistryOptions,
  CvmRegistryCallOptions,
  CvmRegistryEntry,
} from '@napplet/core';
import type { McpMessage } from './cvm-mcp-types.js';
import type {
  CvmDiscoverQuery,
  CvmRequestOptions,
  CvmServer,
  CvmServerRef,
} from './cvm-server-types.js';

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

/** List shell-curated ContextVM registry families. */
export interface CvmRegistryListMessage extends CvmMessage {
  type: 'cvm.registry.list';
  /** Correlation ID for this request. */
  id: string;
  /** Optional registry query. */
  query?: CvmRegistryQuery;
}

/** Result of `cvm.registry.list`. */
export interface CvmRegistryListResultMessage extends CvmMessage {
  type: 'cvm.registry.list.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Registry entries known to the shell. */
  entries?: CvmRegistryEntry[];
  /** Error reason when the registry list could not be read. */
  error?: string;
}

/** Test whether the shell has a provider matching the selector. */
export interface CvmRegistryHasMessage extends CvmMessage {
  type: 'cvm.registry.has';
  /** Correlation ID for this request. */
  id: string;
  /** Tool hash or shell-local family label. */
  selector: CvmRegistrySelector;
  /** Optional provider constraint. */
  options?: CvmRegistryOptions;
}

/** Result of `cvm.registry.has`. */
export interface CvmRegistryHasResultMessage extends CvmMessage {
  type: 'cvm.registry.has.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Whether a provider satisfies the selector and provider constraint. */
  has?: boolean;
  /** Error reason when the registry lookup failed. */
  error?: string;
}

/** Describe the tool set matching the selector. */
export interface CvmRegistryDescribeMessage extends CvmMessage {
  type: 'cvm.registry.describe';
  /** Correlation ID for this request. */
  id: string;
  /** Tool hash or shell-local family label. */
  selector: CvmRegistrySelector;
  /** Optional provider constraint. */
  options?: CvmRegistryOptions;
}

/** Result of `cvm.registry.describe`. */
export interface CvmRegistryDescribeResultMessage extends CvmMessage {
  type: 'cvm.registry.describe.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Shell-selected registry entry. */
  entry?: CvmRegistryEntry;
  /** Error reason when the selected tool set could not be described. */
  error?: string;
}

/** Call a registry tool through the shell-selected provider. */
export interface CvmRegistryCallMessage extends CvmMessage {
  type: 'cvm.registry.call';
  /** Correlation ID for this request. */
  id: string;
  /** Tool hash or shell-local family label. */
  selector: CvmRegistrySelector;
  /** Tool name within the selected set. */
  tool: string;
  /** Optional tool arguments. */
  args?: JsonObject;
  /** Optional provider/cache/payment constraints. */
  options?: CvmRegistryCallOptions;
}

/** Result of `cvm.registry.call`. */
export interface CvmRegistryCallResultMessage extends CvmMessage {
  type: 'cvm.registry.call.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** MCP tool result returned by the selected provider. */
  result?: McpToolResult;
  /** Error reason when the call could not complete. */
  error?: string;
}

/** Napplet -> Shell ContextVM messages. */
export type CvmOutboundMessage =
  | CvmDiscoverMessage
  | CvmRequestMessage
  | CvmCloseMessage
  | CvmRegistryListMessage
  | CvmRegistryHasMessage
  | CvmRegistryDescribeMessage
  | CvmRegistryCallMessage;

/** Shell -> Napplet ContextVM messages. */
export type CvmInboundMessage =
  | CvmDiscoverResultMessage
  | CvmRequestResultMessage
  | CvmCloseResultMessage
  | CvmEventMessage
  | CvmRegistryListResultMessage
  | CvmRegistryHasResultMessage
  | CvmRegistryDescribeResultMessage
  | CvmRegistryCallResultMessage;

/** All ContextVM NAP message types (discriminated union on `type` field). */
export type CvmNapMessage = CvmOutboundMessage | CvmInboundMessage;
