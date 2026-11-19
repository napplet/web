import { postToShell } from '../boundary.js';
import type {
  CvmRegistryCallMessage,
  CvmRegistryCallOptions,
  CvmRegistryDescribeMessage,
  CvmRegistryEntry,
  CvmRegistryHasMessage,
  CvmRegistryListMessage,
  CvmRegistryOptions,
  CvmRegistryQuery,
  CvmRegistrySelector,
  JsonObject,
  McpToolResult,
} from './types.js';
import {
  pendingRegistryCall,
  pendingRegistryDescribe,
  pendingRegistryHas,
  pendingRegistryList,
  REQUEST_TIMEOUT_MS,
} from './cvm-state.js';

/**
 * List shell-curated ContextVM registry families.
 *
 * @param query  Optional search/family/schema/category filter
 * @returns Promise resolving to registry entries
 * @example
 * ```ts
 * await registryList({ category: 'profiles' });
 * ```
 */
export function registryList(query?: CvmRegistryQuery): Promise<CvmRegistryEntry[]> {
  const id = crypto.randomUUID();
  return new Promise<CvmRegistryEntry[]>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingRegistryList.delete(id)) reject(new Error('cvm.registry.list timed out'));
    }, REQUEST_TIMEOUT_MS);
    pendingRegistryList.set(id, { resolve, reject, timeout });

    const msg: CvmRegistryListMessage = {
      type: 'cvm.registry.list',
      id,
      ...(query === undefined ? {} : { query }),
    };
    postToShell(msg);
  });
}

/**
 * Test whether the shell has a provider matching the selector.
 *
 * @param selector Tool hash or shell-local family label
 * @param options  Optional provider constraint
 * @returns Promise resolving to availability
 * @example
 * ```ts
 * await registryHas({ family: 'relatr' });
 * ```
 */
export function registryHas(
  selector: CvmRegistrySelector,
  options?: CvmRegistryOptions,
): Promise<boolean> {
  const id = crypto.randomUUID();
  return new Promise<boolean>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingRegistryHas.delete(id)) reject(new Error('cvm.registry.has timed out'));
    }, REQUEST_TIMEOUT_MS);
    pendingRegistryHas.set(id, { resolve, reject, timeout });

    const msg: CvmRegistryHasMessage = {
      type: 'cvm.registry.has',
      id,
      selector,
      ...(options === undefined ? {} : { options }),
    };
    postToShell(msg);
  });
}

/**
 * Describe the tool set matching the selector.
 *
 * @param selector Tool hash or shell-local family label
 * @param options  Optional provider constraint
 * @returns Promise resolving to the selected registry entry
 * @example
 * ```ts
 * await registryDescribe({ family: 'relatr' });
 * ```
 */
export function registryDescribe(
  selector: CvmRegistrySelector,
  options?: CvmRegistryOptions,
): Promise<CvmRegistryEntry> {
  const id = crypto.randomUUID();
  return new Promise<CvmRegistryEntry>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingRegistryDescribe.delete(id)) reject(new Error('cvm.registry.describe timed out'));
    }, REQUEST_TIMEOUT_MS);
    pendingRegistryDescribe.set(id, { resolve, reject, timeout });

    const msg: CvmRegistryDescribeMessage = {
      type: 'cvm.registry.describe',
      id,
      selector,
      ...(options === undefined ? {} : { options }),
    };
    postToShell(msg);
  });
}

/**
 * Call a tool on the provider selected by the shell.
 *
 * @param selector Tool hash or shell-local family label
 * @param tool     Tool name in the selected set
 * @param args     Optional tool arguments
 * @param options  Optional provider/cache/payment constraints
 * @returns Promise resolving to the MCP tool result
 * @example
 * ```ts
 * await registryCall({ family: 'relatr' }, 'search_profiles', { q: 'jack' });
 * ```
 */
export function registryCall(
  selector: CvmRegistrySelector,
  tool: string,
  args?: JsonObject,
  options?: CvmRegistryCallOptions,
): Promise<McpToolResult> {
  const id = crypto.randomUUID();
  const timeoutMs = options?.timeoutMs ?? REQUEST_TIMEOUT_MS;
  return new Promise<McpToolResult>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingRegistryCall.delete(id)) reject(new Error('cvm.registry.call timed out'));
    }, timeoutMs);
    pendingRegistryCall.set(id, { resolve, reject, timeout });

    const msg: CvmRegistryCallMessage = {
      type: 'cvm.registry.call',
      id,
      selector,
      tool,
      ...(args === undefined ? {} : { args }),
      ...(options === undefined ? {} : { options }),
    };
    postToShell(msg);
  });
}

/** Shell-curated ContextVM registry helper namespace. */
export const registry = {
  list: registryList,
  has: registryHas,
  describe: registryDescribe,
  call: registryCall,
};
