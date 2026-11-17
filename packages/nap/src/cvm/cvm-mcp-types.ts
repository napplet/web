import type {
  McpContentBlock,
  McpToolResult,
  McpTextResourceContents,
  McpResourceContent,
  JsonObject,
  JsonSchema,
  CvmRegistryQuery,
  CvmRegistrySelector,
  CvmRegistryOptions,
  CvmRegistryCallOptions,
  CvmRegistryTool,
  CvmRegistryEntry,
} from '@napplet/core';

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
export type { McpContentBlock };

/**
 * The result of an MCP `tools/call`. `isError: true` signals a tool-level
 * failure whose detail lives in `content`, distinct from a JSON-RPC transport error.
 */
export type { McpToolResult };

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
export type { McpTextResourceContents };

/** Binary contents of an MCP resource (`resources/read`); `blob` is base64-encoded. */
export interface McpBlobResourceContents {
  uri: string;
  mimeType?: string;
  /** Base64-encoded resource bytes. */
  blob: string;
}

/** A single MCP resource content entry: either text or base64 blob. */
export type { McpResourceContent };

export type {
  JsonObject,
  JsonSchema,
  CvmRegistryQuery,
  CvmRegistrySelector,
  CvmRegistryOptions,
  CvmRegistryCallOptions,
  CvmRegistryTool,
  CvmRegistryEntry,
};
