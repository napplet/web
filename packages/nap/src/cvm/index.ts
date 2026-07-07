/**
 * Napplet NAP cvm domain entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/cvm -- ContextVM bridge NAP module (NAP-CVM).
 *
 * Native access to ContextVM servers through the shell. ContextVM transports
 * Model Context Protocol (MCP) JSON-RPC over Nostr relays (kind 25910) using
 * public-key server addressing and encrypted relay events. The shell owns all
 * transport -- relay routing, signing, encryption, JSON-RPC correlation,
 * initialization, policy, and optional payment prompts. Napplets receive MCP
 * results, never ContextVM keys, relay credentials, or socket access.
 *
 * Exports typed message definitions for the cvm domain, shim installer,
 * SDK helpers, and registers the 'cvm' domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import type { CvmServer, McpTool } from '@napplet/nap/cvm';
 * import { DOMAIN, installCvmShim, cvmListTools } from '@napplet/nap/cvm';
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  McpMessage,
  McpTool,
  McpContentBlock,
  McpToolResult,
  McpResource,
  McpTextResourceContents,
  McpBlobResourceContents,
  McpResourceContent,
  CvmServerRef,
  CvmDiscoverQuery,
  CvmServer,
  CvmRequestOptions,
  JsonObject,
  JsonSchema,
  CvmRegistryQuery,
  CvmRegistryOptions,
  CvmRegistryCallOptions,
  CvmRegistryTool,
  CvmRegistryEntry,
  CvmMessage,
  CvmDiscoverMessage,
  CvmDiscoverResultMessage,
  CvmRequestMessage,
  CvmRequestResultMessage,
  CvmCloseMessage,
  CvmCloseResultMessage,
  CvmEventMessage,
  CvmRegistryListMessage,
  CvmRegistryListResultMessage,
  CvmRegistryHasMessage,
  CvmRegistryHasResultMessage,
  CvmRegistryDescribeMessage,
  CvmRegistryDescribeResultMessage,
  CvmRegistryCallMessage,
  CvmRegistryCallResultMessage,
  CvmOutboundMessage,
  CvmInboundMessage,
  CvmNapMessage,
} from './types.js';

export {
  installCvmShim,
  handleCvmMessage,
  discover,
  request,
  listTools,
  callTool,
  listResources,
  readResource,
  close,
  onEvent,
  registryList,
  registryHas,
  registryDescribe,
  registryCall,
  registry,
} from './shim.js';

export {
  cvmDiscover,
  cvmRequest,
  cvmListTools,
  cvmCallTool,
  cvmListResources,
  cvmReadResource,
  cvmClose,
  cvmOnEvent,
  cvmRegistryList,
  cvmRegistryHas,
  cvmRegistryDescribe,
  cvmRegistryCall,
} from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the cvm domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'cvm'.
 */
registerNap(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
