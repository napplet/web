// @napplet/nap/lists -- Runtime-mediated NIP-51 list mutation shim.
// Correlates lists.* request/result envelopes. The runtime owns mutation logic.

import { postToShell } from '../boundary.js';
import type {
  ListItem,
  ListMutationResult,
  ListOptions,
  ListRef,
  ListSupport,
} from '@napplet/core';
import type {
  ListsAddMessage,
  ListsAddResultMessage,
  ListsRemoveMessage,
  ListsRemoveResultMessage,
  ListsSupportedMessage,
  ListsSupportedResultMessage,
} from './types.js';

/** Default timeout for lists request-responses (30s; aligns with other NAPs). */
const REQUEST_TIMEOUT_MS = 30_000;

interface Pending<T> {
  resolve: (result: T) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

const pendingSupported = new Map<string, Pending<ListSupport[]>>();
const pendingAdd = new Map<string, Pending<ListMutationResult>>();
const pendingRemove = new Map<string, Pending<ListMutationResult>>();

/** Guard against double-install. */
let installed = false;

function isMessageType<T extends { type: string }>(
  msg: { type: string },
  type: T['type'],
): msg is T {
  return msg.type === type;
}

function settle<T>(
  pending: Map<string, Pending<T>>,
  id: string,
  resolveValue: T | undefined,
  fallbackError: string,
  error?: string,
): void {
  const p = pending.get(id);
  if (!p) return;
  pending.delete(id);
  clearTimeout(p.timeout);
  if (resolveValue !== undefined) {
    p.resolve(resolveValue);
    return;
  }
  p.reject(new Error(error ?? fallbackError));
}

function mutationResultFrom(msg: ListsAddResultMessage | ListsRemoveResultMessage): ListMutationResult {
  const result: ListMutationResult = { ok: msg.ok };
  if (msg.eventId !== undefined) result.eventId = msg.eventId;
  if (msg.event !== undefined) result.event = msg.event;
  if (msg.added !== undefined) result.added = msg.added;
  if (msg.removed !== undefined) result.removed = msg.removed;
  if (msg.skipped !== undefined) result.skipped = msg.skipped;
  if (msg.error !== undefined) result.error = msg.error;
  if (msg.reason !== undefined) result.reason = msg.reason;
  if (msg.supported !== undefined) result.supported = msg.supported;
  return result;
}

function handleSupportedResult(msg: ListsSupportedResultMessage): void {
  settle(
    pendingSupported,
    msg.id,
    msg.lists,
    'lists.supported failed',
    msg.error,
  );
}

function handleAddResult(msg: ListsAddResultMessage): void {
  settle(pendingAdd, msg.id, mutationResultFrom(msg), 'lists.add failed');
}

function handleRemoveResult(msg: ListsRemoveResultMessage): void {
  settle(pendingRemove, msg.id, mutationResultFrom(msg), 'lists.remove failed');
}

/**
 * Handle lists.* messages from the shell via the central message listener.
 */
export function handleListsMessage(msg: { type: string; [key: string]: unknown }): void {
  if (isMessageType<ListsSupportedResultMessage>(msg, 'lists.supported.result')) {
    handleSupportedResult(msg);
  } else if (isMessageType<ListsAddResultMessage>(msg, 'lists.add.result')) {
    handleAddResult(msg);
  } else if (isMessageType<ListsRemoveResultMessage>(msg, 'lists.remove.result')) {
    handleRemoveResult(msg);
  }
}

function request<T>(
  type: 'lists.supported' | 'lists.add' | 'lists.remove',
  pending: Map<string, Pending<T>>,
  payload: Omit<ListsSupportedMessage | ListsAddMessage | ListsRemoveMessage, 'type' | 'id'>,
): Promise<T> {
  const id = crypto.randomUUID();
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pending.delete(id)) reject(new Error(`${type} timed out`));
    }, REQUEST_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timeout });

    postToShell({
      type,
      id,
      ...payload,
    });
  });
}

/**
 * Return the NIP-51 list kinds/types this runtime supports by policy and
 * implementation.
 *
 * @returns Promise resolving to the supported list descriptions.
 */
export function supported(): Promise<ListSupport[]> {
  return request('lists.supported', pendingSupported, {});
}

/**
 * Add items to a runtime-supported NIP-51 list.
 *
 * The runtime owns lookup, NIP-51 tag formatting, private item encryption,
 * signing, and publishing.
 *
 * @param list     List reference by kind or derived type.
 * @param items    Items to add.
 * @param options  Optional create/metadata hints.
 * @returns Promise resolving to the mutation result.
 */
export function add(
  list: ListRef,
  items: ListItem[],
  options?: ListOptions,
): Promise<ListMutationResult> {
  return request('lists.add', pendingAdd, {
    list,
    items,
    ...(options ? { options } : {}),
  });
}

/**
 * Remove items from a runtime-supported NIP-51 list.
 *
 * @param list     List reference by kind or derived type.
 * @param items    Items to remove.
 * @param options  Optional runtime hints.
 * @returns Promise resolving to the mutation result.
 */
export function remove(
  list: ListRef,
  items: ListItem[],
  options?: ListOptions,
): Promise<ListMutationResult> {
  return request('lists.remove', pendingRemove, {
    list,
    items,
    ...(options ? { options } : {}),
  });
}

/**
 * Install the lists shim. Registration-only -- mutations are issued on demand.
 *
 * @returns cleanup function that rejects pending requests and clears state.
 */
export function installListsShim(): () => void {
  if (installed) {
    return () => undefined; // already installed: no-op cleanup
  }
  installed = true;
  return () => {
    for (const p of pendingSupported.values()) {
      clearTimeout(p.timeout);
      p.reject(new Error('lists shim uninstalled'));
    }
    for (const p of pendingAdd.values()) {
      clearTimeout(p.timeout);
      p.reject(new Error('lists shim uninstalled'));
    }
    for (const p of pendingRemove.values()) {
      clearTimeout(p.timeout);
      p.reject(new Error('lists shim uninstalled'));
    }
    pendingSupported.clear();
    pendingAdd.clear();
    pendingRemove.clear();
    installed = false;
  };
}
