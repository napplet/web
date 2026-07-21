/**
 * Napplet NAP common types entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/common -- Common social action message types for the JSON envelope wire protocol.
 *
 * NAP-COMMON lets napplets ask the shell to perform common Nostr social tasks:
 * public NIP-19 encode/decode, profile lookup, follows, follow/unfollow,
 * reactions, and reports. The shell owns identity, consent, event construction,
 * signing, publishing, relay access, and NIP-19 handling.
 *
 * Defines the message types exchanged between napplet and shell:
 * - Napplet -> Shell: encodeNip19, decodeNip19, getProfile, follows, follow, unfollow, react, report
 * - Shell -> Napplet: corresponding *.result messages
 *
 * All types form a discriminated union on the envelope `type` field.
 */

import type {
  NappletMessage,
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

/** The NAP domain name for common social action messages. */
export const DOMAIN = 'common' as const;

export type {
  CommonActionResult,
  CommonEventReportTarget,
  CommonFollowsResult,
  CommonNip19DecodeResult,
  CommonNip19EncodeInput,
  CommonNip19EncodeResult,
  CommonNip19Type,
  CommonProfileData,
  CommonProfileResult,
  CommonProfileTarget,
  CommonPubkeyReportTarget,
  CommonReaction,
  CommonReportReason,
  CommonReportTarget,
} from '@napplet/core';

/** Base interface for all common NAP messages. */
export interface CommonMessage extends NappletMessage {
  /** Message type in "common.<action>" format. */
  type: `common.${string}`;
}

/** Request public NIP-19 encoding. */
export interface CommonEncodeNip19Message extends CommonMessage {
  type: 'common.encodeNip19';
  /** Correlation ID for this request. */
  id: string;
  /** Structured encode input. */
  input: CommonNip19EncodeInput;
}

/** Result of public NIP-19 encoding. */
export interface CommonEncodeNip19ResultMessage extends CommonMessage, CommonNip19EncodeResult {
  type: 'common.encodeNip19.result';
  /** Correlation ID matching the original request. */
  id: string;
}

/** Request public NIP-19 decoding. */
export interface CommonDecodeNip19Message extends CommonMessage {
  type: 'common.decodeNip19';
  /** Correlation ID for this request. */
  id: string;
  /** NIP-19 value to decode. */
  value: string;
}

/** Result of public NIP-19 decoding. */
export interface CommonDecodeNip19ResultMessage extends CommonMessage, CommonNip19DecodeResult {
  type: 'common.decodeNip19.result';
  /** Correlation ID matching the original request. */
  id: string;
}

/** Request profile lookup by hex pubkey, npub, or nprofile. */
export interface CommonGetProfileMessage extends CommonMessage {
  type: 'common.getProfile';
  /** Correlation ID for this request. */
  id: string;
  /** Profile target to resolve. */
  target: CommonProfileTarget;
}

/** Result of profile lookup. */
export interface CommonGetProfileResultMessage extends CommonMessage, CommonProfileResult {
  type: 'common.getProfile.result';
  /** Correlation ID matching the original request. */
  id: string;
}

/** Request the shell user's follows. */
export interface CommonFollowsMessage extends CommonMessage {
  type: 'common.follows';
  /** Correlation ID for this request. */
  id: string;
}

/** Result of the follows request. */
export interface CommonFollowsResultMessage extends CommonMessage, CommonFollowsResult {
  type: 'common.follows.result';
  /** Correlation ID matching the original request. */
  id: string;
}

/** Request following one or more npub targets. */
export interface CommonFollowMessage extends CommonMessage {
  type: 'common.follow';
  /** Correlation ID for this request. */
  id: string;
  /** Npub targets to follow. */
  pubkeys: string[];
}

/** Result of a follow request. */
export interface CommonFollowResultMessage extends CommonMessage, CommonActionResult {
  type: 'common.follow.result';
  /** Correlation ID matching the original request. */
  id: string;
}

/** Request unfollowing one or more npub targets. */
export interface CommonUnfollowMessage extends CommonMessage {
  type: 'common.unfollow';
  /** Correlation ID for this request. */
  id: string;
  /** Npub targets to unfollow. */
  pubkeys: string[];
}

/** Result of an unfollow request. */
export interface CommonUnfollowResultMessage extends CommonMessage, CommonActionResult {
  type: 'common.unfollow.result';
  /** Correlation ID matching the original request. */
  id: string;
}

/** Request a reaction to a native Nostr event. */
export interface CommonReactMessage extends CommonMessage {
  type: 'common.react';
  /** Correlation ID for this request. */
  id: string;
  /** Event id to react to. */
  targetEventId: string;
  /** Reaction content. */
  reaction: CommonReaction;
  /** Optional custom emoji URL. */
  customEmojiHref?: string;
}

/** Result of a reaction request. */
export interface CommonReactResultMessage extends CommonMessage, CommonActionResult {
  type: 'common.react.result';
  /** Correlation ID matching the original request. */
  id: string;
}

/** Request a NIP-56 report. */
export interface CommonReportMessage extends CommonMessage {
  type: 'common.report';
  /** Correlation ID for this request. */
  id: string;
  /** Event or pubkey report target. */
  target: CommonReportTarget;
  /** NIP-56 report reason. */
  reason: CommonReportReason;
  /** Report text. */
  text: string;
}

/** Result of a report request. */
export interface CommonReportResultMessage extends CommonMessage, CommonActionResult {
  type: 'common.report.result';
  /** Correlation ID matching the original request. */
  id: string;
}

/** Napplet -> Shell common messages. */
export type CommonOutboundMessage =
  | CommonEncodeNip19Message
  | CommonDecodeNip19Message
  | CommonGetProfileMessage
  | CommonFollowsMessage
  | CommonFollowMessage
  | CommonUnfollowMessage
  | CommonReactMessage
  | CommonReportMessage;

/** Shell -> Napplet common messages. */
export type CommonInboundMessage =
  | CommonEncodeNip19ResultMessage
  | CommonDecodeNip19ResultMessage
  | CommonGetProfileResultMessage
  | CommonFollowsResultMessage
  | CommonFollowResultMessage
  | CommonUnfollowResultMessage
  | CommonReactResultMessage
  | CommonReportResultMessage;

/** All common NAP message types (discriminated union on `type` field). */
export type CommonNapMessage = CommonOutboundMessage | CommonInboundMessage;
