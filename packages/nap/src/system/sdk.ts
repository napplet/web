/**
 * @napplet/nap/system -- SDK helpers wrapping window.napplet.system.
 *
 * These convenience functions delegate to `window.napplet.system.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type { NappletGlobal } from '@napplet/core';
import type {
  SystemMediaStatus,
  SystemNapStatus,
  SystemRelayStatus,
  SystemScopeStatus,
  SystemScopeSummary,
  SystemServiceStatus,
  SystemStorageStatus,
} from './types.js';

function requireSystem(): NappletGlobal['system'] {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.system) {
    throw new Error('window.napplet.system not installed -- import @napplet/shim first');
  }
  return w.napplet.system;
}

/** @returns Promise resolving to NAP support statuses */
export function systemNaps(): Promise<SystemNapStatus[]> {
  return requireSystem().naps();
}

/** @returns Promise resolving to runtime service statuses */
export function systemServices(): Promise<SystemServiceStatus[]> {
  return requireSystem().services();
}

/** @returns Promise resolving to relay transport statuses */
export function systemRelays(): Promise<SystemRelayStatus[]> {
  return requireSystem().relays();
}

/** @returns Promise resolving to event-cache status */
export function systemEventCache(): Promise<SystemStorageStatus> {
  return requireSystem().eventCache();
}

/** @returns Promise resolving to local-storage status */
export function systemLocalStorage(): Promise<SystemStorageStatus> {
  return requireSystem().localStorage();
}

/** @returns Promise resolving to indexed storage status */
export function systemIndexedDb(): Promise<SystemStorageStatus> {
  return requireSystem().indexedDb();
}

/** @returns Promise resolving to media subsystem status */
export function systemMedia(): Promise<SystemMediaStatus> {
  return requireSystem().media();
}

/** @returns Promise resolving to napplet-scoped storage status */
export function systemNappletStorage(): Promise<SystemStorageStatus> {
  return requireSystem().nappletStorage();
}

/** @returns Promise resolving to scoped diagnostic area summaries */
export function systemScopes(): Promise<SystemScopeSummary[]> {
  return requireSystem().scopes();
}

/**
 * Return runtime-defined details for one napplet-scoped diagnostic area.
 *
 * @param name  Runtime-defined scope name
 * @returns Promise resolving to scoped status
 */
export function systemScope(name: string): Promise<SystemScopeStatus> {
  return requireSystem().scope(name);
}
