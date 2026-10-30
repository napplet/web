/** NAP-CATALOG data shapes. Living proposal: https://github.com/napplet/naps/pull/95. */
interface CatalogIdentityFields {
  pubkey: string;
  eventId: string;
  artifactHash: string;
}

/** Verified version identity; opaque catalog selectors are separate. */
export type NappletIdentity = CatalogIdentityFields & (
  | { kind: 35129; dTag: string }
  | { kind: 5129 | 15129; dTag?: never }
);

/** Accepted convention and its advertised parameter names. */
export interface IntentDescriptor {
  intent: string;
  convention: string;
  parameters: string[];
}

/** Manifest role and the conventions advertised for that role. */
export interface ArchetypeDescriptor {
  archetype: string;
  intents: IntentDescriptor[];
}

/** Complete caller-visible metadata for an available napplet. */
export interface NappletDescriptor {
  id: string;
  identity: NappletIdentity;
  title?: string;
  description: string;
  requires: string[];
  optional: string[];
  archetypes: ArchetypeDescriptor[];
}

/** Current implicit dispatch selection, independent of running instances. */
export interface ArchetypeHandler {
  archetype: string;
  currentHandler: string | null;
}

/** One point-in-time view after runtime caller-policy filtering. */
export interface CatalogSnapshot {
  napplets: NappletDescriptor[];
  handlers: ArchetypeHandler[];
}

/** Optional read-only runtime catalog; querying does not require intent. */
export interface CatalogApi {
  /**
   * Read the napplets currently available to this caller.
   * @returns A complete point-in-time catalog snapshot.
   * @example const snapshot = await window.napplet.catalog.get();
   */
  get(): Promise<CatalogSnapshot>;
}
