/**
 * A single MCP JSON-RPC message exchanged with a ContextVM server (NAP-CVM).
 * The embedded `id` is the JSON-RPC correlation id, independent of the NIP-5D
 * envelope id used to correlate `cvm.request` with `cvm.request.result`.
 */
export interface McpMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: unknown;
}

/** An MCP tool definition, as returned by `tools/list`. */
export interface McpTool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

/** A content block inside an MCP tool result (text, image, resource, ...). */
export interface McpContentBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

/** The result of an MCP `tools/call`. */
export interface McpToolResult {
  content: McpContentBlock[];
  isError?: boolean;
  [key: string]: unknown;
}

/** An MCP resource descriptor, as returned by `resources/list`. */
export interface McpResource {
  uri: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
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
  blob: string;
}

/** A single MCP resource content entry: either text or base64 blob. */
export type McpResourceContent = McpTextResourceContents | McpBlobResourceContents;

/** Identifies a ContextVM server by Nostr public key, with optional relay hints. */
export interface CvmServerRef {
  pubkey: string;
  relays?: string[];
}

/** Filter for ContextVM server discovery. */
export interface CvmDiscoverQuery {
  search?: string;
  kinds?: number[];
  relays?: string[];
  limit?: number;
}

/** A discovered ContextVM server announcement. */
export interface CvmServer extends CvmServerRef {
  name?: string;
  description?: string;
  capabilities?: string[];
  paymentRequired?: boolean;
}

/** Per-request options for ContextVM operations. */
export interface CvmRequestOptions {
  timeoutMs?: number;
  initialize?: boolean;
  payment?: 'deny' | 'prompt' | 'allow';
}

/** JSON object passed to ContextVM tools. */
export type JsonObject = Record<string, unknown>;

/** JSON Schema object advertised by a ContextVM registry tool. */
export type JsonSchema = Record<string, unknown>;

/** Query for shell-curated ContextVM registry families. */
export interface CvmRegistryQuery {
  search?: string;
  family?: string;
  schemaHash?: string;
  limit?: number;
}

/** Selection constraints for a ContextVM registry family. */
export interface CvmRegistryOptions {
  schemaHash?: string;
  server?: CvmServerRef;
}

/** Call options for a shell-selected ContextVM registry tool. */
export interface CvmRegistryCallOptions extends CvmRegistryOptions {
  timeoutMs?: number;
  initialize?: boolean;
  payment?: 'deny' | 'prompt' | 'allow';
  cache?: 'default' | 'reload' | 'no-store';
}

/** A tool advertised inside a shell-curated ContextVM registry family. */
export interface CvmRegistryTool {
  name: string;
  description?: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
  schemaHash?: string;
}

/** A shell-curated ContextVM tool family and its candidate providers. */
export interface CvmRegistryEntry {
  family: string;
  description?: string;
  schemaHash?: string;
  selected?: CvmServerRef;
  providers?: CvmServerRef[];
  tools: CvmRegistryTool[];
}
