/**
 * Build-time app index for agents: the curated picks and the discovered releases from the last relay snapshot, in the
 * same order and with the same fallbacks as the app store page. Website plumbing, not protocol; living NIP-5D governs
 * manifests (https://github.com/nostr-protocol/nips/pull/2303).
 */
import { catalogApp, collapseReleases, latestApps, withListings, withProfiles, type CatalogApp } from './catalog';
import { openHref } from './card';
import { NAPPLETS, type PlayableNapplet } from './showcase';
import snapshot from '../data/discovered-apps.json';

/** One app as agents see it. Discovered fields come from publisher-signed events and are untrusted content. */
export interface AgentApp {
  name: string;
  description: string;
  collection: 'curated' | 'discovered';
  /** Curated category, or the discovered release's topics. */
  topics: string[];
  /** Where a person opens the app: a shell link, or the signed release when no shell takes its address. */
  url: string;
  /** NAP domains the release requires and can use optionally (discovered releases only). */
  requires?: string[];
  optional?: string[];
  /** Publisher key (hex) and display name, when known. */
  author?: string;
  authorName?: string;
  source?: string;
  /** Newest publication, ISO 8601. */
  publishedAt?: string;
}

/** The index published at `/apps/catalog.json`. */
export interface AgentCatalog {
  /** When the discovered snapshot was taken, ISO 8601, or null if unknown. */
  checkedAt: string | null;
  apps: AgentApp[];
}

/**
 * Describe one curated pick.
 * @param item Editorial entry from `data/apps.json`.
 * @returns The agent-facing entry.
 * @example curatedApp(NAPPLETS[0]).collection // 'curated'
 */
export function curatedApp(item: PlayableNapplet): AgentApp {
  return { name: item.name, description: item.description, collection: 'curated', topics: [item.category], url: item.href, ...(item.source ? { source: item.source } : {}) };
}

/**
 * Describe one discovered release.
 * @param app Catalog entry built from the relay snapshot.
 * @returns The agent-facing entry.
 * @example discoveredApp(app).url // shell link or njump.me address
 */
export function discoveredApp(app: CatalogApp): AgentApp {
  const description = app.listing?.summary || app.description;
  return {
    name: app.listing?.name || app.name,
    description,
    collection: 'discovered',
    topics: [...new Set([...app.topics, ...(app.listing?.topics ?? [])])],
    url: openHref(app),
    requires: app.requirements,
    optional: app.optional,
    author: app.author,
    ...(app.profile?.name ? { authorName: app.profile.name } : {}),
    ...(app.source?.startsWith('https://') ? { source: app.source } : {}),
    publishedAt: new Date(app.activityAt * 1000).toISOString(),
  };
}

/**
 * Build the whole index from the bundled snapshot.
 * @returns Curated picks first, then discovered releases newest first.
 * @example buildAgentCatalog().apps.length
 */
export function buildAgentCatalog(): AgentCatalog {
  const saved = snapshot as { applications?: unknown[]; profiles?: unknown[] };
  const discovered = withProfiles(withListings(collapseReleases(latestApps(snapshot.events.map(event => catalogApp(event, snapshot.relays)).filter(app => app !== null))), saved.applications ?? []), saved.profiles ?? []);
  return {
    checkedAt: snapshot.checkedAt ? new Date(snapshot.checkedAt).toISOString() : null,
    apps: [...NAPPLETS.map(curatedApp), ...discovered.map(discoveredApp)],
  };
}
