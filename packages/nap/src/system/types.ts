/**
 * @napplet/nap/system -- Read-only runtime diagnostics message types for the JSON envelope wire protocol.
 *
 * NAP-SYSTEM gives napplets narrow accessors for runtime status snapshots.
 * Every operation is read-only, request/result correlated, and redacted by the
 * runtime. There is no push surface.
 */

import type {
  NappletMessage,
  SystemHealth,
  SystemMediaStatus,
  SystemNapStatus,
  SystemRelayStatus,
  SystemScopeStatus,
  SystemScopeSummary,
  SystemServiceStatus,
  SystemStorageStatus,
} from '@napplet/core';

/** The NAP domain name for system messages. */
export const DOMAIN = 'system' as const;

export type {
  SystemHealth,
  SystemNapStatus,
  SystemServiceStatus,
  SystemRelayStatus,
  SystemStorageStatus,
  SystemMediaStatus,
  SystemScopeSummary,
  SystemScopeStatus,
};

/** Accessors defined by NAP-SYSTEM. */
export type SystemAccessor =
  | 'naps'
  | 'services'
  | 'relays'
  | 'eventCache'
  | 'localStorage'
  | 'indexedDb'
  | 'media'
  | 'nappletStorage'
  | 'scopes'
  | 'scope';

/** Base interface for all system NAP messages. */
export interface SystemMessage extends NappletMessage {
  /** Message type in "system.<action>" format. */
  type: `system.${string}`;
}

/** Request NAP support visible to this napplet. */
export interface SystemNapsMessage extends SystemMessage {
  type: 'system.naps';
  /** Correlation ID for this request. */
  id: string;
}

/** Request runtime service availability and health. */
export interface SystemServicesMessage extends SystemMessage {
  type: 'system.services';
  /** Correlation ID for this request. */
  id: string;
}

/** Request connected relay transport status. */
export interface SystemRelaysMessage extends SystemMessage {
  type: 'system.relays';
  /** Correlation ID for this request. */
  id: string;
}

/** Request runtime event-cache status. */
export interface SystemEventCacheMessage extends SystemMessage {
  type: 'system.eventCache';
  /** Correlation ID for this request. */
  id: string;
}

/** Request runtime local-storage status. */
export interface SystemLocalStorageMessage extends SystemMessage {
  type: 'system.localStorage';
  /** Correlation ID for this request. */
  id: string;
}

/** Request runtime IndexedDB / indexed object store status. */
export interface SystemIndexedDbMessage extends SystemMessage {
  type: 'system.indexedDb';
  /** Correlation ID for this request. */
  id: string;
}

/** Request runtime media subsystem status. */
export interface SystemMediaMessage extends SystemMessage {
  type: 'system.media';
  /** Correlation ID for this request. */
  id: string;
}

/** Request NAP-STORAGE-style usage scoped to this napplet. */
export interface SystemNappletStorageMessage extends SystemMessage {
  type: 'system.nappletStorage';
  /** Correlation ID for this request. */
  id: string;
}

/** Request napplet-scoped diagnostic area summaries. */
export interface SystemScopesMessage extends SystemMessage {
  type: 'system.scopes';
  /** Correlation ID for this request. */
  id: string;
}

/** Request a named scoped diagnostic area. */
export interface SystemScopeMessage extends SystemMessage {
  type: 'system.scope';
  /** Correlation ID for this request. */
  id: string;
  /** Runtime-defined scope name. */
  name: string;
}

/** Result of `system.naps`. */
export interface SystemNapsResultMessage extends SystemMessage {
  type: 'system.naps.result';
  id: string;
  naps?: SystemNapStatus[];
  error?: string;
}

/** Result of `system.services`. */
export interface SystemServicesResultMessage extends SystemMessage {
  type: 'system.services.result';
  id: string;
  services?: SystemServiceStatus[];
  error?: string;
}

/** Result of `system.relays`. */
export interface SystemRelaysResultMessage extends SystemMessage {
  type: 'system.relays.result';
  id: string;
  relays?: SystemRelayStatus[];
  error?: string;
}

/** Result of `system.eventCache`. */
export interface SystemEventCacheResultMessage extends SystemMessage {
  type: 'system.eventCache.result';
  id: string;
  status?: SystemStorageStatus;
  error?: string;
}

/** Result of `system.localStorage`. */
export interface SystemLocalStorageResultMessage extends SystemMessage {
  type: 'system.localStorage.result';
  id: string;
  status?: SystemStorageStatus;
  error?: string;
}

/** Result of `system.indexedDb`. */
export interface SystemIndexedDbResultMessage extends SystemMessage {
  type: 'system.indexedDb.result';
  id: string;
  status?: SystemStorageStatus;
  error?: string;
}

/** Result of `system.nappletStorage`. */
export interface SystemNappletStorageResultMessage extends SystemMessage {
  type: 'system.nappletStorage.result';
  id: string;
  status?: SystemStorageStatus;
  error?: string;
}

/** Result of `system.media`. */
export interface SystemMediaResultMessage extends SystemMessage {
  type: 'system.media.result';
  id: string;
  status?: SystemMediaStatus;
  error?: string;
}

/** Result of `system.scopes`. */
export interface SystemScopesResultMessage extends SystemMessage {
  type: 'system.scopes.result';
  id: string;
  scopes?: SystemScopeSummary[];
  error?: string;
}

/** Result of `system.scope`. */
export interface SystemScopeResultMessage extends SystemMessage {
  type: 'system.scope.result';
  id: string;
  scope?: SystemScopeStatus;
  error?: string;
}

/** Napplet -> Shell system messages. */
export type SystemRequestMessage =
  | SystemNapsMessage
  | SystemServicesMessage
  | SystemRelaysMessage
  | SystemEventCacheMessage
  | SystemLocalStorageMessage
  | SystemIndexedDbMessage
  | SystemMediaMessage
  | SystemNappletStorageMessage
  | SystemScopesMessage;

/** Napplet -> Shell system messages. */
export type SystemOutboundMessage = SystemRequestMessage | SystemScopeMessage;

/** Result messages carrying a storage-like `status` field. */
export type SystemStorageResultMessage =
  | SystemEventCacheResultMessage
  | SystemLocalStorageResultMessage
  | SystemIndexedDbResultMessage
  | SystemNappletStorageResultMessage;

/** Shell -> Napplet system messages. */
export type SystemInboundMessage =
  | SystemNapsResultMessage
  | SystemServicesResultMessage
  | SystemRelaysResultMessage
  | SystemStorageResultMessage
  | SystemMediaResultMessage
  | SystemScopesResultMessage
  | SystemScopeResultMessage;

/** All system NAP message types (discriminated union on `type` field). */
export type SystemNapMessage = SystemOutboundMessage | SystemInboundMessage;
