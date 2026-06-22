// @napplet/nap/system -- Read-only runtime diagnostics shim.
// Correlates system.* request/result envelopes. NAP-SYSTEM has no push surface.

import { postToShell } from '../boundary.js';
import type {
  SystemInboundMessage,
  SystemMediaStatus,
  SystemNapStatus,
  SystemRelayStatus,
  SystemRequestMessage,
  SystemScopeMessage,
  SystemScopeStatus,
  SystemScopeSummary,
  SystemServiceStatus,
  SystemStorageStatus,
} from './types.js';

/** Default timeout for system request-response operations. */
const REQUEST_TIMEOUT_MS = 30_000;

type Resolver<T> = {
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  resultType: SystemInboundMessage['type'];
  field: string;
  fallback: string;
};

const pending = new Map<string, Resolver<unknown>>();
let installed = false;

function rejectResult(msg: Record<string, unknown>, fallback: string): Error {
  return new Error(typeof msg.error === 'string' ? msg.error : fallback);
}

function readField(msg: Record<string, unknown>, field: string): unknown {
  return msg[field];
}

function request<T>(
  type: SystemRequestMessage['type'],
  resultType: SystemInboundMessage['type'],
  field: string,
  fallback: string,
): Promise<T> {
  const id = crypto.randomUUID();
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pending.delete(id)) reject(new Error(`${type} timed out`));
    }, REQUEST_TIMEOUT_MS);
    pending.set(id, {
      resolve: resolve as (value: unknown) => void,
      reject,
      timeout,
      resultType,
      field,
      fallback,
    });

    const msg: SystemRequestMessage = { type, id };
    postToShell(msg);
  });
}

/**
 * Handle system.* result messages from the shell via the central message listener.
 *
 * @param msg  The shell envelope to route
 */
export function handleSystemMessage(msg: { type: string; [key: string]: unknown }): void {
  const id = typeof msg.id === 'string' ? msg.id : undefined;
  if (!id) return;
  const entry = pending.get(id);
  if (!entry || msg.type !== entry.resultType) return;

  pending.delete(id);
  clearTimeout(entry.timeout);

  const value = readField(msg, entry.field);
  if (value !== undefined) {
    entry.resolve(value);
    return;
  }
  entry.reject(rejectResult(msg, entry.fallback));
}

/**
 * Return NAP support visible to this napplet.
 *
 * @returns Promise resolving to NAP support statuses
 */
export function naps(): Promise<SystemNapStatus[]> {
  return request('system.naps', 'system.naps.result', 'naps', 'system NAP status unavailable');
}

/**
 * Return runtime service availability and health.
 *
 * @returns Promise resolving to service statuses
 */
export function services(): Promise<SystemServiceStatus[]> {
  return request('system.services', 'system.services.result', 'services', 'system services unavailable');
}

/**
 * Return connected relay transport status.
 *
 * @returns Promise resolving to relay statuses
 */
export function relays(): Promise<SystemRelayStatus[]> {
  return request('system.relays', 'system.relays.result', 'relays', 'system relays unavailable');
}

/**
 * Return runtime event-cache status.
 *
 * @returns Promise resolving to event-cache status
 */
export function eventCache(): Promise<SystemStorageStatus> {
  return request('system.eventCache', 'system.eventCache.result', 'status', 'system event cache unavailable');
}

/**
 * Return runtime local-storage status.
 *
 * @returns Promise resolving to local-storage status
 */
export function localStorage(): Promise<SystemStorageStatus> {
  return request('system.localStorage', 'system.localStorage.result', 'status', 'system local storage unavailable');
}

/**
 * Return runtime IndexedDB / indexed object store status.
 *
 * @returns Promise resolving to indexed storage status
 */
export function indexedDb(): Promise<SystemStorageStatus> {
  return request('system.indexedDb', 'system.indexedDb.result', 'status', 'system indexed storage unavailable');
}

/**
 * Return runtime media subsystem status.
 *
 * @returns Promise resolving to media status
 */
export function media(): Promise<SystemMediaStatus> {
  return request('system.media', 'system.media.result', 'status', 'system media unavailable');
}

/**
 * Return NAP-STORAGE-style usage scoped to this napplet.
 *
 * @returns Promise resolving to napplet-scoped storage status
 */
export function nappletStorage(): Promise<SystemStorageStatus> {
  return request('system.nappletStorage', 'system.nappletStorage.result', 'status', 'system napplet storage unavailable');
}

/**
 * List napplet-scoped diagnostic areas available through `scope(name)`.
 *
 * @returns Promise resolving to scope summaries
 */
export function scopes(): Promise<SystemScopeSummary[]> {
  return request('system.scopes', 'system.scopes.result', 'scopes', 'system scopes unavailable');
}

/**
 * Return runtime-defined details for one napplet-scoped diagnostic area.
 *
 * @param name  Runtime-defined scope name
 * @returns Promise resolving to scoped status
 */
export function scope(name: string): Promise<SystemScopeStatus> {
  const id = crypto.randomUUID();
  return new Promise<SystemScopeStatus>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pending.delete(id)) reject(new Error('system.scope timed out'));
    }, REQUEST_TIMEOUT_MS);
    pending.set(id, {
      resolve: resolve as (value: unknown) => void,
      reject,
      timeout,
      resultType: 'system.scope.result',
      field: 'scope',
      fallback: 'system scope unavailable',
    });

    const msg: SystemScopeMessage = { type: 'system.scope', id, name };
    postToShell(msg);
  });
}

/**
 * Install the system shim. Registration-only -- system snapshots are read on demand.
 *
 * @returns cleanup function that clears pending requests
 */
export function installSystemShim(): () => void {
  if (installed) {
    return () => undefined; // already installed: no-op cleanup
  }
  installed = true;
  return () => {
    for (const entry of pending.values()) clearTimeout(entry.timeout);
    pending.clear();
    installed = false;
  };
}
