/**
 * Napplet NAP cvm sdk entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/cvm -- SDK helpers wrapping window.napplet.cvm.
 *
 * These convenience functions delegate to `window.napplet.cvm.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type { NappletGlobal, Subscription } from '@napplet/core';
import type {
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
} from './types.js';

function requireCvm(): NonNullable<NappletGlobal['cvm']> {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.cvm) {
    throw new Error('window.napplet.cvm is unavailable -- runtime did not inject this domain');
  }
  return w.napplet.cvm;
}

/**
 * Discover public ContextVM servers known to the shell.
 *
 * @param query  Optional discovery filter
 * @returns Promise resolving to the discovered servers
 *
 * @example
 * ```ts
 * import { cvmDiscover } from '@napplet/nap/cvm';
 *
 * const servers = await cvmDiscover({ search: 'relay', limit: 5 });
 * ```
 */
export function cvmDiscover(query?: CvmDiscoverQuery): Promise<CvmServer[]> {
  return requireCvm().discover(query);
}

/**
 * Send a raw MCP JSON-RPC message to a ContextVM server.
 *
 * @param server   Target ContextVM server
 * @param message  MCP JSON-RPC message
 * @param options  Optional per-request options
 * @returns Promise resolving to the MCP response message
 */
export function cvmRequest(
  server: CvmServerRef,
  message: McpMessage,
  options?: CvmRequestOptions,
): Promise<McpMessage> {
  return requireCvm().request(server, message, options);
}

/**
 * List the tools exposed by a ContextVM server (MCP `tools/list`).
 *
 * @param server   Target ContextVM server
 * @param options  Optional per-request options
 * @returns Promise resolving to the server's tool definitions
 */
export function cvmListTools(
  server: CvmServerRef,
  options?: CvmRequestOptions,
): Promise<McpTool[]> {
  return requireCvm().listTools(server, options);
}

/**
 * Call a tool on a ContextVM server (MCP `tools/call`).
 *
 * @param server   Target ContextVM server
 * @param name     Tool name
 * @param args     Tool arguments
 * @param options  Optional per-request options
 * @returns Promise resolving to the MCP tool result
 *
 * @example
 * ```ts
 * import { cvmCallTool } from '@napplet/nap/cvm';
 *
 * const result = await cvmCallTool({ pubkey: '65a334...' }, 'get_relay', {
 *   url: 'wss://relay.example.com',
 * });
 * ```
 */
export function cvmCallTool(
  server: CvmServerRef,
  name: string,
  args?: Record<string, unknown>,
  options?: CvmRequestOptions,
): Promise<McpToolResult> {
  return requireCvm().callTool(server, name, args, options);
}

/**
 * List the resources exposed by a ContextVM server (MCP `resources/list`).
 *
 * @param server   Target ContextVM server
 * @param options  Optional per-request options
 * @returns Promise resolving to the server's resource descriptors
 */
export function cvmListResources(
  server: CvmServerRef,
  options?: CvmRequestOptions,
): Promise<McpResource[]> {
  return requireCvm().listResources(server, options);
}

/**
 * Read a resource from a ContextVM server (MCP `resources/read`).
 *
 * @param server   Target ContextVM server
 * @param uri      Resource URI
 * @param options  Optional per-request options
 * @returns Promise resolving to the first resource content entry
 */
export function cvmReadResource(
  server: CvmServerRef,
  uri: string,
  options?: CvmRequestOptions,
): Promise<McpResourceContent> {
  return requireCvm().readResource(server, uri, options);
}

/**
 * Close shell-maintained session state for a server.
 *
 * @param server  Server whose session should be torn down
 * @returns Promise that resolves once the shell confirms closure
 */
export function cvmClose(server: CvmServerRef): Promise<void> {
  return requireCvm().close(server);
}

/**
 * Listen for server-pushed MCP messages (`cvm.event`).
 *
 * @param callback  Called with `(server, message)` for each server event
 * @returns A Subscription with `close()` to stop listening
 */
export function cvmOnEvent(
  callback: (server: CvmServerRef, message: McpMessage) => void,
): Subscription {
  return requireCvm().onEvent(callback);
}

/**
 * List shell-curated ContextVM registry families.
 *
 * @param query  Optional search/family/schema filter
 * @returns Promise resolving to registry entries
 */
export function cvmRegistryList(query?: CvmRegistryQuery): Promise<CvmRegistryEntry[]> {
  return requireCvm().registry.list(query);
}

/**
 * Test whether the shell can call a ContextVM registry family.
 *
 * @param family   Registry family name
 * @param options  Optional schema/provider constraints
 * @returns Promise resolving to availability
 */
export function cvmRegistryHas(
  family: string,
  options?: CvmRegistryOptions,
): Promise<boolean> {
  return requireCvm().registry.has(family, options);
}

/**
 * Describe a shell-selected ContextVM registry family.
 *
 * @param family   Registry family name
 * @param options  Optional schema/provider constraints
 * @returns Promise resolving to the selected registry entry
 */
export function cvmRegistryDescribe(
  family: string,
  options?: CvmRegistryOptions,
): Promise<CvmRegistryEntry> {
  return requireCvm().registry.describe(family, options);
}

/**
 * Call a tool on the shell-selected provider for a ContextVM registry family.
 *
 * @param family   Registry family name
 * @param tool     Tool name inside the family
 * @param args     Optional tool arguments
 * @param options  Optional schema/provider/cache/payment constraints
 * @returns Promise resolving to the MCP tool result
 */
export function cvmRegistryCall(
  family: string,
  tool: string,
  args?: JsonObject,
  options?: CvmRegistryCallOptions,
): Promise<McpToolResult> {
  return requireCvm().registry.call(family, tool, args, options);
}
