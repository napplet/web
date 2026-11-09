/** Application-side catalog helpers; the runtime owns injection and policy. */
import type { CatalogSnapshot, NappletGlobal } from '@napplet/core';

/**
 * Read the current runtime catalog through the injected optional domain.
 * @returns The caller-visible catalog snapshot.
 * @example const snapshot = await catalogGet();
 */
export function catalogGet(): Promise<CatalogSnapshot> {
  const napplet = typeof window === 'undefined' ? undefined : (window as Window & { napplet?: NappletGlobal }).napplet;
  if (!napplet?.catalog) throw new Error('window.napplet.catalog is unavailable -- runtime did not inject this domain');
  return napplet.catalog.get();
}

export { catalogGet as get };
