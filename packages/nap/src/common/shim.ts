// @napplet/nap/common -- Common social action shim.
// Correlates common.* request/result envelopes. The shell owns identity,
// consent, event construction, signing, publishing, relay access, and NIP-19.

import { postToShell } from '../boundary.js';
import type {
  CommonActionResult,
  CommonFollowsResult,
  CommonNip19DecodeResult,
  CommonNip19EncodeInput,
  CommonNip19EncodeResult,
  CommonProfileResult,
  CommonProfileTarget,
  CommonReaction,
  CommonReportReason,
  CommonReportTarget,
} from '@napplet/core';
import type {
  CommonDecodeNip19Message,
  CommonDecodeNip19ResultMessage,
  CommonEncodeNip19Message,
  CommonEncodeNip19ResultMessage,
  CommonFollowMessage,
  CommonFollowResultMessage,
  CommonFollowsMessage,
  CommonFollowsResultMessage,
  CommonGetProfileMessage,
  CommonGetProfileResultMessage,
  CommonReactMessage,
  CommonReactResultMessage,
  CommonReportMessage,
  CommonReportResultMessage,
  CommonUnfollowMessage,
  CommonUnfollowResultMessage,
} from './types.js';

/** Default timeout for common request-responses (30s; aligns with other NAPs). */
const REQUEST_TIMEOUT_MS = 30_000;

type Pending<T> = {
  resolve: (result: T) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

const pendingEncode = new Map<string, Pending<CommonNip19EncodeResult>>();
const pendingDecode = new Map<string, Pending<CommonNip19DecodeResult>>();
const pendingProfile = new Map<string, Pending<CommonProfileResult>>();
const pendingFollows = new Map<string, Pending<CommonFollowsResult>>();
const pendingFollow = new Map<string, Pending<CommonActionResult>>();
const pendingUnfollow = new Map<string, Pending<CommonActionResult>>();
const pendingReact = new Map<string, Pending<CommonActionResult>>();
const pendingReport = new Map<string, Pending<CommonActionResult>>();

let installed = false;

function isMessageType<T extends { type: string }>(
  msg: { type: string },
  type: T['type'],
): msg is T {
  return msg.type === type;
}

function withoutEnvelope<T>(msg: { type: string; id: string; [key: string]: unknown }): T {
  const { type: _type, id: _id, ...result } = msg;
  return result as T;
}

function resolveResult<T extends { ok: boolean; error?: string }>(
  pending: Map<string, Pending<T>>,
  msg: { type: string; id: string; ok?: unknown; error?: string; [key: string]: unknown },
  fallback: string,
): void {
  const p = pending.get(msg.id);
  if (!p) return;
  pending.delete(msg.id);
  clearTimeout(p.timeout);
  if (typeof msg.ok === 'boolean') {
    p.resolve(withoutEnvelope<T>(msg));
    return;
  }
  p.reject(new Error(msg.error ?? fallback));
}

function request<T>(
  pending: Map<string, Pending<T>>,
  timeoutMessage: string,
  message: (id: string) => { type: string; id: string },
): Promise<T> {
  const id = crypto.randomUUID();
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pending.delete(id)) reject(new Error(timeoutMessage));
    }, REQUEST_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timeout });
    postToShell(message(id));
  });
}

/**
 * Handle common.* messages from the shell via the central message listener.
 * Covers every NAP-COMMON result envelope.
 */
export function handleCommonMessage(msg: { type: string; [key: string]: unknown }): void {
  if (isMessageType<CommonEncodeNip19ResultMessage>(msg, 'common.encodeNip19.result')) {
    resolveResult(pendingEncode, msg, 'common.encodeNip19 failed');
  } else if (isMessageType<CommonDecodeNip19ResultMessage>(msg, 'common.decodeNip19.result')) {
    resolveResult(pendingDecode, msg, 'common.decodeNip19 failed');
  } else if (isMessageType<CommonGetProfileResultMessage>(msg, 'common.getProfile.result')) {
    resolveResult(pendingProfile, msg, 'common.getProfile failed');
  } else if (isMessageType<CommonFollowsResultMessage>(msg, 'common.follows.result')) {
    resolveResult(pendingFollows, msg, 'common.follows failed');
  } else if (isMessageType<CommonFollowResultMessage>(msg, 'common.follow.result')) {
    resolveResult(pendingFollow, msg, 'common.follow failed');
  } else if (isMessageType<CommonUnfollowResultMessage>(msg, 'common.unfollow.result')) {
    resolveResult(pendingUnfollow, msg, 'common.unfollow failed');
  } else if (isMessageType<CommonReactResultMessage>(msg, 'common.react.result')) {
    resolveResult(pendingReact, msg, 'common.react failed');
  } else if (isMessageType<CommonReportResultMessage>(msg, 'common.report.result')) {
    resolveResult(pendingReport, msg, 'common.report failed');
  }
}

/**
 * Encode a supported public NIP-19 value. `nsec` is intentionally unsupported.
 * @param input  Structured NIP-19 encode input
 * @returns Promise resolving to the shell encode result
 */
export function encodeNip19(input: CommonNip19EncodeInput): Promise<CommonNip19EncodeResult> {
  return request(pendingEncode, 'common.encodeNip19 timed out', (id): CommonEncodeNip19Message => ({
    type: 'common.encodeNip19',
    id,
    input,
  }));
}

/**
 * Decode a supported public NIP-19 value. `nsec` is intentionally unsupported.
 * @param value  NIP-19 value to decode
 * @returns Promise resolving to normalized decoded fields
 */
export function decodeNip19(value: string): Promise<CommonNip19DecodeResult> {
  return request(pendingDecode, 'common.decodeNip19 timed out', (id): CommonDecodeNip19Message => ({
    type: 'common.decodeNip19',
    id,
    value,
  }));
}

/**
 * Resolve a profile by hex pubkey, npub, or nprofile.
 * @param target  Profile target
 * @returns Promise resolving to latest profile data when available
 */
export function getProfile(target: CommonProfileTarget): Promise<CommonProfileResult> {
  return request(pendingProfile, 'common.getProfile timed out', (id): CommonGetProfileMessage => ({
    type: 'common.getProfile',
    id,
    target,
  }));
}

/**
 * Return the shell user's followed pubkeys as hex.
 * @returns Promise resolving to followed pubkeys
 */
export function follows(): Promise<CommonFollowsResult> {
  return request(pendingFollows, 'common.follows timed out', (id): CommonFollowsMessage => ({
    type: 'common.follows',
    id,
  }));
}

/**
 * Ask the shell to follow one or more npub targets.
 * @param pubkeys  Npub targets to follow
 * @returns Promise resolving to the action result
 */
export function follow(...pubkeys: string[]): Promise<CommonActionResult> {
  return request(pendingFollow, 'common.follow timed out', (id): CommonFollowMessage => ({
    type: 'common.follow',
    id,
    pubkeys,
  }));
}

/**
 * Ask the shell to unfollow one or more npub targets.
 * @param pubkeys  Npub targets to unfollow
 * @returns Promise resolving to the action result
 */
export function unfollow(...pubkeys: string[]): Promise<CommonActionResult> {
  return request(pendingUnfollow, 'common.unfollow timed out', (id): CommonUnfollowMessage => ({
    type: 'common.unfollow',
    id,
    pubkeys,
  }));
}

/**
 * React to a native Nostr event.
 * @param targetEventId     Event id to react to
 * @param reaction          Reaction content
 * @param customEmojiHref   Optional custom emoji URL
 * @returns Promise resolving to the action result
 */
export function react(
  targetEventId: string,
  reaction: CommonReaction,
  customEmojiHref?: string,
): Promise<CommonActionResult> {
  return request(pendingReact, 'common.react timed out', (id): CommonReactMessage => ({
    type: 'common.react',
    id,
    targetEventId,
    reaction,
    ...(customEmojiHref === undefined ? {} : { customEmojiHref }),
  }));
}

/**
 * Report an event or pubkey with a NIP-56 reason.
 * @param target  Structured report target
 * @param reason  NIP-56 report reason
 * @param text    Report text
 * @returns Promise resolving to the action result
 */
export function report(
  target: CommonReportTarget,
  reason: CommonReportReason,
  text: string,
): Promise<CommonActionResult> {
  return request(pendingReport, 'common.report timed out', (id): CommonReportMessage => ({
    type: 'common.report',
    id,
    target,
    reason,
    text,
  }));
}

/**
 * Install the common shim. Registration-only -- common actions are issued on
 * demand, not at install time.
 *
 * @returns cleanup function that clears pending requests
 */
export function installCommonShim(): () => void {
  if (installed) {
    return () => undefined;
  }
  installed = true;
  return () => {
    for (const pending of [
      pendingEncode,
      pendingDecode,
      pendingProfile,
      pendingFollows,
      pendingFollow,
      pendingUnfollow,
      pendingReact,
      pendingReport,
    ]) {
      for (const p of pending.values()) clearTimeout(p.timeout);
      pending.clear();
    }
    installed = false;
  };
}
