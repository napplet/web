/**
 * Napplet NAP common sdk entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/common -- SDK helpers wrapping window.napplet.common.
 *
 * These convenience functions delegate to `window.napplet.common.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type { NappletGlobal } from '@napplet/core';
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
} from './types.js';

function requireCommon(): NonNullable<NappletGlobal['common']> {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.common) {
    throw new Error('window.napplet.common is unavailable -- runtime did not inject this domain');
  }
  return w.napplet.common;
}

/**
 * Encode a supported public NIP-19 value.
 * @param input  Structured NIP-19 encode input
 * @returns Promise resolving to the shell encode result
 */
export function commonEncodeNip19(input: CommonNip19EncodeInput): Promise<CommonNip19EncodeResult> {
  return requireCommon().encodeNip19(input);
}

/**
 * Decode a supported public NIP-19 value.
 * @param value  NIP-19 value to decode
 * @returns Promise resolving to normalized decoded fields
 */
export function commonDecodeNip19(value: string): Promise<CommonNip19DecodeResult> {
  return requireCommon().decodeNip19(value);
}

/**
 * Resolve a profile by hex pubkey, npub, or nprofile.
 * @param target  Profile target
 * @returns Promise resolving to latest profile data when available
 */
export function commonGetProfile(target: CommonProfileTarget): Promise<CommonProfileResult> {
  return requireCommon().getProfile(target);
}

/**
 * Return the shell user's followed pubkeys as hex.
 * @returns Promise resolving to followed pubkeys
 */
export function commonFollows(): Promise<CommonFollowsResult> {
  return requireCommon().follows();
}

/**
 * Ask the shell to follow one or more npub targets.
 * @param pubkeys  Npub targets to follow
 * @returns Promise resolving to the action result
 */
export function commonFollow(...pubkeys: string[]): Promise<CommonActionResult> {
  return requireCommon().follow(...pubkeys);
}

/**
 * Ask the shell to unfollow one or more npub targets.
 * @param pubkeys  Npub targets to unfollow
 * @returns Promise resolving to the action result
 */
export function commonUnfollow(...pubkeys: string[]): Promise<CommonActionResult> {
  return requireCommon().unfollow(...pubkeys);
}

/**
 * React to a native Nostr event.
 * @param targetEventId     Event id to react to
 * @param reaction          Reaction content
 * @param customEmojiHref   Optional custom emoji URL
 * @returns Promise resolving to the action result
 */
export function commonReact(
  targetEventId: string,
  reaction: CommonReaction,
  customEmojiHref?: string,
): Promise<CommonActionResult> {
  return requireCommon().react(targetEventId, reaction, customEmojiHref);
}

/**
 * Report an event or pubkey with a NIP-56 reason.
 * @param target  Structured report target
 * @param reason  NIP-56 report reason
 * @param text    Report text
 * @returns Promise resolving to the action result
 */
export function commonReport(
  target: CommonReportTarget,
  reason: CommonReportReason,
  text: string,
): Promise<CommonActionResult> {
  return requireCommon().report(target, reason, text);
}
