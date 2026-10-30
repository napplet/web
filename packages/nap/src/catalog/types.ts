/** NAP-CATALOG envelopes. Canonical wire: https://github.com/napplet/naps/pull/95. */
import type { CatalogSnapshot, NappletMessage } from '@napplet/core';

export const DOMAIN = 'catalog' as const;
export type { CatalogApi, CatalogSnapshot, NappletIdentity, NappletDescriptor, ArchetypeDescriptor, IntentDescriptor, ArchetypeHandler } from '@napplet/core';

export interface CatalogGetMessage extends NappletMessage {
  type: 'catalog.get';
  id: string;
}

/** A runtime error excludes the snapshot. */
export type CatalogGetResultMessage = NappletMessage & {
  type: 'catalog.get.result';
  id: string;
} & (
  | { snapshot: CatalogSnapshot; error?: never }
  | { error: string; snapshot?: never }
);
export type CatalogRequestMessage = CatalogGetMessage;
export type CatalogResultMessage = CatalogGetResultMessage;
export type CatalogNapMessage = CatalogGetMessage | CatalogGetResultMessage;
