/**
 * @napplet/sdk -- Link, lists, common, and serial wrapper objects.
 *
 * @packageDocumentation
 */

import type {
  LinkOpenOptions,
  LinkOpenResult,
  ListItem,
  ListMutationResult,
  ListOptions,
  ListRef,
  ListSupport,
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
  SerialEvent,
  SerialOpenRequest,
  SerialOpenResult,
  Subscription,
} from '@napplet/core';
import { requireNapplet } from './require-napplet.js';

/**
 * Shell-mediated link opening (NAP-LINK): ask the shell to open an external URL
 * for user-visible navigation. The shell owns prompting, policy, opener
 * isolation, and browser context.
 *
 * @example
 * ```ts
 * import { link } from '@napplet/sdk';
 *
 * const result = await link.open('https://example.com/post/123', { label: 'Read post' });
 * ```
 */
export const link = {
  /**
   * Request that the shell open an external URL for the user.
   * @param url      Absolute URL to open
   * @param options  Optional prompt/display hints
   * @returns Promise resolving to the shell's open/deny status
   */
  open(url: string, options?: LinkOpenOptions): Promise<LinkOpenResult> {
    return requireNapplet().link.open(url, options);
  },
};

/**
 * Runtime-mediated NIP-51 list mutations (NAP-LISTS): add or remove semantic
 * items from supported NIP-51 lists while the runtime owns lookup, merge,
 * encryption, signing, and publishing.
 *
 * @example
 * ```ts
 * import { lists } from '@napplet/sdk';
 *
 * await lists.add({ type: 'mute-list' }, [
 *   { itemType: 'pubkey', value: 'abc123...' },
 * ]);
 * ```
 */
export const lists = {
  /**
   * Return the NIP-51 list kinds/types this runtime supports.
   * @returns Promise resolving to supported list descriptions
   */
  supported(): Promise<ListSupport[]> {
    return requireNapplet().lists.supported();
  },

  /**
   * Add items to a runtime-supported NIP-51 list.
   * @param list     List reference by kind or derived type
   * @param items    Items to add
   * @param options  Optional create/metadata hints
   */
  add(list: ListRef, items: ListItem[], options?: ListOptions): Promise<ListMutationResult> {
    return requireNapplet().lists.add(list, items, options);
  },

  /**
   * Remove items from a runtime-supported NIP-51 list.
   * @param list     List reference by kind or derived type
   * @param items    Items to remove
   * @param options  Optional runtime hints
   */
  remove(list: ListRef, items: ListItem[], options?: ListOptions): Promise<ListMutationResult> {
    return requireNapplet().lists.remove(list, items, options);
  },
};

/**
 * Common social actions (NAP-COMMON): shell-mediated public NIP-19 helpers,
 * profile lookup, follows, follow/unfollow, reactions, and reports. The shell
 * owns identity, consent, event construction, signing, publishing, relay access,
 * and NIP-19 handling.
 *
 * @example
 * ```ts
 * import { common } from '@napplet/sdk';
 *
 * const { pubkeys } = await common.follows();
 * await common.react(noteId, '+');
 * ```
 */
export const common = {
  /**
   * Encode a supported public NIP-19 value.
   * @param input  Structured NIP-19 encode input
   * @returns Promise resolving to the shell encode result
   */
  encodeNip19(input: CommonNip19EncodeInput): Promise<CommonNip19EncodeResult> {
    return requireNapplet().common.encodeNip19(input);
  },

  /**
   * Decode a supported public NIP-19 value.
   * @param value  NIP-19 value to decode
   * @returns Promise resolving to normalized decoded fields
   */
  decodeNip19(value: string): Promise<CommonNip19DecodeResult> {
    return requireNapplet().common.decodeNip19(value);
  },

  /**
   * Resolve a profile by hex pubkey, npub, or nprofile.
   * @param target  Profile target
   * @returns Promise resolving to latest profile data when available
   */
  getProfile(target: CommonProfileTarget): Promise<CommonProfileResult> {
    return requireNapplet().common.getProfile(target);
  },

  /**
   * Return the shell user's followed pubkeys as hex.
   * @returns Promise resolving to followed pubkeys
   */
  follows(): Promise<CommonFollowsResult> {
    return requireNapplet().common.follows();
  },

  /**
   * Ask the shell to follow one or more npub targets.
   * @param pubkeys  Npub targets to follow
   * @returns Promise resolving to the action result
   */
  follow(...pubkeys: string[]): Promise<CommonActionResult> {
    return requireNapplet().common.follow(...pubkeys);
  },

  /**
   * Ask the shell to unfollow one or more npub targets.
   * @param pubkeys  Npub targets to unfollow
   * @returns Promise resolving to the action result
   */
  unfollow(...pubkeys: string[]): Promise<CommonActionResult> {
    return requireNapplet().common.unfollow(...pubkeys);
  },

  /**
   * React to a native Nostr event.
   * @param targetEventId     Event id to react to
   * @param reaction          Reaction content
   * @param customEmojiHref   Optional custom emoji URL
   * @returns Promise resolving to the action result
   */
  react(
    targetEventId: string,
    reaction: CommonReaction,
    customEmojiHref?: string,
  ): Promise<CommonActionResult> {
    return requireNapplet().common.react(targetEventId, reaction, customEmojiHref);
  },

  /**
   * Report an event or pubkey with a NIP-56 reason.
   * @param target  Structured report target
   * @param reason  NIP-56 report reason
   * @param text    Report text
   * @returns Promise resolving to the action result
   */
  report(
    target: CommonReportTarget,
    reason: CommonReportReason,
    text: string,
  ): Promise<CommonActionResult> {
    return requireNapplet().common.report(target, reason, text);
  },
};

/**
 * Runtime-mediated serial device access (NAP-SERIAL): ask the shell to select
 * and open a user-approved serial session, write byte arrays to that session,
 * and receive shell-pushed state/data/close events. The shell owns raw port
 * handles, streams, OS paths, permissions, read loops, and lifecycle policy.
 *
 * @example
 * ```ts
 * import { serial } from '@napplet/sdk';
 *
 * const { session } = await serial.open({ options: { baudRate: 115200 } });
 * await serial.write(session.id, [112, 105, 110, 103, 10]);
 * ```
 */
export const serial = {
  /**
   * Ask the runtime to select and open a serial session.
   * @param request  Filters, options, and optional chooser label
   * @returns Promise resolving to the runtime-assigned serial open result
   */
  open(request: SerialOpenRequest): Promise<SerialOpenResult> {
    return requireNapplet().serial.open(request);
  },

  /**
   * Write bytes to an open serial session.
   * @param sessionId  Runtime-assigned serial session id
   * @param data       Byte values to write
   * @returns Promise resolving after the runtime acknowledges the write
   */
  write(sessionId: string, data: Uint8Array | number[]): Promise<void> {
    return requireNapplet().serial.write(sessionId, data);
  },

  /**
   * Close an open serial session.
   * @param sessionId  Runtime-assigned serial session id
   * @param reason     Optional reason for the close request
   * @returns Promise resolving after the runtime acknowledges the close
   */
  close(sessionId: string, reason?: string): Promise<void> {
    return requireNapplet().serial.close(sessionId, reason);
  },

  /**
   * Register for shell-pushed serial events.
   * @param handler  Called with each serial event
   * @returns A Subscription with `close()` to stop listening
   */
  onEvent(handler: (event: SerialEvent) => void): Subscription {
    return requireNapplet().serial.onEvent(handler);
  },
};
