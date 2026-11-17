import type {
  CvmDiscoverQuery,
  CvmRegistryCallOptions,
  CvmRegistryEntry,
  CvmRegistryOptions,
  CvmRegistryQuery,
  CvmRegistrySelector,
  CvmRequestOptions,
  CvmServer,
  CvmServerRef,
  JsonObject,
  McpMessage,
  McpResource,
  McpResourceContent,
  McpTool,
  McpToolResult,
  Subscription,
} from '@napplet/core';
import { requireDomain } from './require-napplet.js';
import type { SdkDomain } from './sdk-domain.js';

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
export const cvm: SdkDomain<'cvm'> = {
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
     * @param query  Optional family/search/schema/category filter
     */
    list(query?: CvmRegistryQuery): Promise<CvmRegistryEntry[]> {
      return requireDomain('cvm').registry.list(query);
    },

    /**
     * Test whether the shell has a provider matching the selector.
     * @param selector Tool hash or shell-local family label
     * @param options  Optional provider constraint
     */
    has(selector: CvmRegistrySelector, options?: CvmRegistryOptions): Promise<boolean> {
      return requireDomain('cvm').registry.has(selector, options);
    },

    /**
     * Describe the tool set matching the selector.
     * @param selector Tool hash or shell-local family label
     * @param options  Optional provider constraint
     */
    describe(
      selector: CvmRegistrySelector,
      options?: CvmRegistryOptions,
    ): Promise<CvmRegistryEntry> {
      return requireDomain('cvm').registry.describe(selector, options);
    },

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
    ): Promise<McpToolResult> {
      return requireDomain('cvm').registry.call(selector, tool, args, options);
    },
  },
};
