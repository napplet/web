import type { Subscription } from '../nostr.js';
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
  JsonObject,
  CvmRegistryCallOptions,
  CvmRegistryEntry,
  CvmRegistryOptions,
  CvmRegistryQuery,
  CvmRegistrySelector,
} from '../cvm.js';

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
 * if (window.napplet.cvm) {
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
  /**
   * Shell-curated ContextVM tool families. The shell selects providers,
   * verifies schema hashes, applies cache/payment policy, and performs calls.
   */
  registry: {
    /**
     * List registry families known to the shell.
     * @param query  Optional family/search/schema/category filter
     */
    list(query?: CvmRegistryQuery): Promise<CvmRegistryEntry[]>;
    /**
     * Test whether the shell has a provider matching the selector.
     * @param selector Tool hash or shell-local family label
     * @param options  Optional provider constraint
     */
    has(selector: CvmRegistrySelector, options?: CvmRegistryOptions): Promise<boolean>;
    /**
     * Describe the tool set matching the selector.
     * @param selector Tool hash or shell-local family label
     * @param options  Optional provider constraint
     */
    describe(selector: CvmRegistrySelector, options?: CvmRegistryOptions): Promise<CvmRegistryEntry>;
    /**
     * Call a tool on the provider selected by the shell.
     * @param selector Tool hash or shell-local family label
     * @param tool     Tool name in the selected set
     * @param args     Tool arguments
     * @param options  Optional provider/cache/payment constraints
     */
    call(
      selector: CvmRegistrySelector,
      tool: string,
      args?: JsonObject,
      options?: CvmRegistryCallOptions,
    ): Promise<McpToolResult>;
  };
}
