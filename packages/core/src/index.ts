/**
 * @napplet/core -- Shared protocol types, constants, and topic definitions.
 *
 * This package is the single source of truth for all protocol-level
 * definitions in the napplet ecosystem. All other @napplet/* packages
 * import their protocol types and constants from here.
 *
 * Zero dependencies. No DOM or browser APIs.
 *
 * @example
 * ```ts
 * import {
 *   type NostrEvent, type NostrFilter,
 *   type NappletMessage, type NubDomain, type ShellSupports,
 *   type NubHandler, type NubDispatch,
 *   NUB_DOMAINS, TOPICS,
 *   createDispatch, registerNub, dispatch, getRegisteredDomains,
 * } from '@napplet/core';
 * ```
 *
 * @packageDocumentation
 */

export type { NappletMessage, NubDomain, NamespacedCapability, ShellSupports, NappletGlobalShell } from './envelope.js';
export { NUB_DOMAINS } from './envelope.js';

export type { NubHandler, NubDispatch } from './dispatch.js';
export { createDispatch, registerNub, dispatch, getRegisteredDomains } from './dispatch.js';

export type {
  NostrEvent,
  NostrFilter,
  Subscription,
  EventTemplate,
  UnsignedEvent,
  Rumor,
  NappletGlobal,
} from './types.js';

export { TOPICS } from './topics.js';
export type { TopicKey, TopicValue } from './topics.js';
