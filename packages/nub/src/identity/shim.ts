// @napplet/nub/identity -- Identity NUB shim (read-only user identity queries)
// All queries are request/response pairs over postMessage to the shell.

import type { Subscription } from '@napplet/core';
import type {
  ProfileData,
  ZapReceipt,
  Badge,
  RelayPermission,
  IdentityGetPublicKeyMessage,
  IdentityGetRelaysMessage,
  IdentityGetProfileMessage,
  IdentityGetFollowsMessage,
  IdentityGetListMessage,
  IdentityGetZapsMessage,
  IdentityGetMutesMessage,
  IdentityGetBlockedMessage,
  IdentityGetBadgesMessage,
  IdentityNapMessage,
} from './types.js';

/** Default timeout for identity queries (30 seconds). */
const REQUEST_TIMEOUT_MS = 30_000;

/** Pending identity requests: correlation id -> { resolve, reject }. */
const pendingRequests = new Map<string, {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

/** identity.changed subscribers. */
const changeHandlers = new Set<(pubkey: string) => void>();

/** Guard against double-install. */
let installed = false;

const IDENTITY_MESSAGE_TYPES = new Set<string>([
  'identity.getPublicKey.result',
  'identity.getRelays.result',
  'identity.getProfile.result',
  'identity.getFollows.result',
  'identity.getList.result',
  'identity.getZaps.result',
  'identity.getMutes.result',
  'identity.getBlocked.result',
  'identity.getBadges.result',
  'identity.changed',
  'identity.getPublicKey',
  'identity.getRelays',
  'identity.getProfile',
  'identity.getFollows',
  'identity.getList',
  'identity.getZaps',
  'identity.getMutes',
  'identity.getBlocked',
  'identity.getBadges',
]);

function isIdentityNapMessage(msg: { type: string }): msg is IdentityNapMessage {
  return IDENTITY_MESSAGE_TYPES.has(msg.type);
}

/**
 * Handle identity.* result messages from the shell via the central message listener.
 */
export function handleIdentityMessage(msg: { type: string; [key: string]: unknown }): void {
  if (!isIdentityNapMessage(msg)) return;

  switch (msg.type) {
    case 'identity.getPublicKey.result':
      resolvePending(msg.id, msg.pubkey);
      return;
    case 'identity.changed':
      notifyChanged(msg.pubkey);
      return;
    case 'identity.getRelays.result':
      resolveOrReject(msg.id, msg.relays, msg.error);
      return;
    case 'identity.getProfile.result':
      resolveOrReject(msg.id, msg.profile, msg.error);
      return;
    case 'identity.getFollows.result':
      resolveOrReject(msg.id, msg.pubkeys, msg.error);
      return;
    case 'identity.getList.result':
      resolveOrReject(msg.id, msg.entries, msg.error);
      return;
    case 'identity.getZaps.result':
      resolveOrReject(msg.id, msg.zaps, msg.error);
      return;
    case 'identity.getMutes.result':
      resolveOrReject(msg.id, msg.pubkeys, msg.error);
      return;
    case 'identity.getBlocked.result':
      resolveOrReject(msg.id, msg.pubkeys, msg.error);
      return;
    case 'identity.getBadges.result':
      resolveOrReject(msg.id, msg.badges, msg.error);
      return;

    // ─── Napplet → Shell request messages (defensive — never received here) ──
    case 'identity.getPublicKey':
    case 'identity.getRelays':
    case 'identity.getProfile':
    case 'identity.getFollows':
    case 'identity.getList':
    case 'identity.getZaps':
    case 'identity.getMutes':
    case 'identity.getBlocked':
    case 'identity.getBadges':
      // Request-side envelopes are sent napplet → shell; the handler should
      // never receive one. Exhaustiveness requires coverage; defensive no-op.
      return;

    default:
      // Compile-time exhaustiveness assertion (TYPES-05).
      // Adding a new member to IdentityNubMessage without a case here fails type-check.
      assertNever(msg);
      return;
  }
}

function resolvePending(id: string, value: unknown): void {
  const pending = pendingRequests.get(id);
  if (!pending) return;
  pendingRequests.delete(id);
  clearTimeout(pending.timeout);
  pending.resolve(value);
}

function rejectPending(id: string, reason: Error): void {
  const pending = pendingRequests.get(id);
  if (!pending) return;
  pendingRequests.delete(id);
  clearTimeout(pending.timeout);
  pending.reject(reason);
}

function resolveOrReject(id: string, value: unknown, error?: string): void {
  const pending = pendingRequests.get(id);
  if (!pending) return;
  pendingRequests.delete(id);
  clearTimeout(pending.timeout);
  if (error) {
    pending.reject(new Error(error));
  } else {
    pending.resolve(value);
  }
}

function notifyChanged(pubkey: string): void {
  if (typeof pubkey !== 'string') return;
  for (const handler of changeHandlers) {
    handler(pubkey);
  }
}

function sendRequest<T>(msg: { type: string; id: string }): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingRequests.delete(msg.id)) {
        reject(new Error(`${msg.type} timed out`));
      }
    }, REQUEST_TIMEOUT_MS);

    pendingRequests.set(msg.id, {
      resolve: resolve as (value: unknown) => void,
      reject,
      timeout,
    });

    window.parent.postMessage(msg, '*');
  });
}

/**
 * Compile-time exhaustiveness assertion for discriminated-union switches.
 *
 * If a new member is added to `IdentityNubMessage` and the switch in
 * `handleIdentityMessage` does not add a matching case, TypeScript fails
 * type-check at this call site with "Argument of type 'X' is not assignable
 * to parameter of type 'never'". This enforces TYPES-05 at compile time.
 *
 * @param _msg  Never-narrowed value (the switch default branch); unused at runtime.
 */
function assertNever(_msg: never): void {
  /* compile-time only — unreachable at runtime if the switch is exhaustive */
}

/**
 * Get the user's hex-encoded public key.
 * Always succeeds. Resolves to "" when no user/signer is connected.
 *
 * @returns Hex-encoded public key string, or ""
 */
export function getPublicKey(): Promise<string> {
  const msg: IdentityGetPublicKeyMessage = {
    type: 'identity.getPublicKey',
    id: crypto.randomUUID(),
  };
  return sendRequest<string>(msg);
}

/**
 * Listen for shell-pushed user identity changes.
 *
 * @param handler  Called with a hex pubkey, or "" when no user/signer is connected
 * @returns Subscription with close() to detach the handler
 */
export function onChanged(handler: (pubkey: string) => void): Subscription {
  changeHandlers.add(handler);
  let closed = false;
  return {
    close() {
      if (closed) return;
      closed = true;
      changeHandlers.delete(handler);
    },
  };
}

/**
 * Get the user's relay list (NIP-65).
 *
 * @returns Record mapping relay URLs to read/write permissions
 */
export function getRelays(): Promise<Record<string, RelayPermission>> {
  const msg: IdentityGetRelaysMessage = {
    type: 'identity.getRelays',
    id: crypto.randomUUID(),
  };
  return sendRequest<Record<string, RelayPermission>>(msg);
}

/**
 * Get the user's profile metadata (kind 0).
 *
 * @returns Profile data, or null if no profile found
 */
export function getProfile(): Promise<ProfileData | null> {
  const msg: IdentityGetProfileMessage = {
    type: 'identity.getProfile',
    id: crypto.randomUUID(),
  };
  return sendRequest<ProfileData | null>(msg);
}

/**
 * Get the user's follow list (kind 3 contact list).
 *
 * @returns Array of hex-encoded public keys
 */
export function getFollows(): Promise<string[]> {
  const msg: IdentityGetFollowsMessage = {
    type: 'identity.getFollows',
    id: crypto.randomUUID(),
  };
  return sendRequest<string[]>(msg);
}

/**
 * Get entries from a user's categorized list.
 *
 * @param listType  List category (e.g., "bookmarks", "interests", "pins")
 * @returns Array of list entry values
 */
export function getList(listType: string): Promise<string[]> {
  const msg: IdentityGetListMessage = {
    type: 'identity.getList',
    id: crypto.randomUUID(),
    listType,
  };
  return sendRequest<string[]>(msg);
}

/**
 * Get zap receipts sent to the user.
 *
 * @returns Array of zap receipt objects
 */
export function getZaps(): Promise<ZapReceipt[]> {
  const msg: IdentityGetZapsMessage = {
    type: 'identity.getZaps',
    id: crypto.randomUUID(),
  };
  return sendRequest<ZapReceipt[]>(msg);
}

/**
 * Get the user's mute list (kind 10000).
 *
 * @returns Array of hex-encoded muted public keys
 */
export function getMutes(): Promise<string[]> {
  const msg: IdentityGetMutesMessage = {
    type: 'identity.getMutes',
    id: crypto.randomUUID(),
  };
  return sendRequest<string[]>(msg);
}

/**
 * Get the user's block list.
 *
 * @returns Array of hex-encoded blocked public keys
 */
export function getBlocked(): Promise<string[]> {
  const msg: IdentityGetBlockedMessage = {
    type: 'identity.getBlocked',
    id: crypto.randomUUID(),
  };
  return sendRequest<string[]>(msg);
}

/**
 * Get badges awarded to the user (NIP-58).
 *
 * @returns Array of badge objects
 */
export function getBadges(): Promise<Badge[]> {
  const msg: IdentityGetBadgesMessage = {
    type: 'identity.getBadges',
    id: crypto.randomUUID(),
  };
  return sendRequest<Badge[]>(msg);
}

/**
 * Install the identity shim.
 * Identity change subscriptions are local fan-out over shell-pushed messages.
 *
 * @returns cleanup function that clears pending requests and change handlers
 */
export function installIdentityShim(): () => void {
  if (installed) {
    return () => { /* already installed */ };
  }

  installed = true;

  return () => {
    for (const pending of pendingRequests.values()) {
      clearTimeout(pending.timeout);
    }
    pendingRequests.clear();
    changeHandlers.clear();
    installed = false;
  };
}
