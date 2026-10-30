/** Application-side read-only catalog. Guard optional domain presence before use. */
import type { CatalogApi, CatalogSnapshot } from '@napplet/core';
import { requireDomain } from './require-napplet.js';

/**
 * Request the catalog currently visible to this napplet.
 * @returns A complete snapshot; this call does not launch or authorize a target.
 * @example const snapshot = await get();
 */
export function get(): Promise<CatalogSnapshot> { return requireDomain('catalog').get(); }

/**
 * Read-only runtime napplet discovery.
 * @example const snapshot = await catalog.get();
 */
export const catalog: CatalogApi = { get };

export type { CatalogApi, CatalogSnapshot, NappletIdentity, NappletDescriptor, ArchetypeDescriptor, IntentDescriptor, ArchetypeHandler } from '@napplet/core';
export { catalogGet } from '@napplet/nap/catalog/sdk';
