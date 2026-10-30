/** Catalog presentation, not a conformance validator. Living NIP-5D governs manifests. */
import { validateEvent, verifyEvent, type Event } from 'nostr-tools/pure';
import { naddrEncode, neventEncode } from 'nostr-tools/nip19';
import {
  getNappletArchetypes, getNappletIcon, getNappletIdentifier, getNappletOptionalDomains,
  getNappletRequiredDomains, getNappletServers, getNappletSource, getNappletTitle, isSha256, isValidNapplet,
} from 'applesauce-common/helpers';

/** Kind of the Software Applications proposal (nostr-protocol/nips#1336), separate from napplet manifests. */
export const APPLICATION_KIND = 32267;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type ImageType = typeof IMAGE_TYPES[number];

/** One content-addressed media blob from a manifest `icon`, `screenshot` or `preview` tag. */
export interface ManifestMedia { sha256: string; type?: string; dim?: string; alt?: string }

/** URL-based metadata from a matching kind 32267 listing; never a substitute for manifest identity. */
export interface Listing { id: string; name: string; summary: string; icon?: string; images: string[]; topics: string[]; website?: string; repository?: string; license?: string; publishedAt: number }

export interface CatalogApp {
  id: string;
  name: string;
  description: string;
  author: string;
  publishedAt: number;
  requirements: string[];
  optional: string[];
  archetypes: string[];
  topics: string[];
  source?: string;
  servers: string[];
  icon?: ManifestMedia;
  screenshots: ManifestMedia[];
  preview?: ManifestMedia;
  coordinate?: string;
  pointer: string;
  listing?: Listing;
  event: Event;
}

/** Split NIP-92 style `key value` fields; the first space separates the key. */
function fields(tag: string[]): Map<string, string> | null {
  const seen = new Map<string, string>();
  for (const field of tag.slice(1)) {
    const space = field.indexOf(' ');
    if (space <= 0) continue;
    const key = field.slice(0, space);
    const value = field.slice(space + 1);
    // Repeated keys make the tag unusable for `x` and are ignored for optional fields.
    if (seen.has(key)) { if (key === 'x') return null; continue; }
    seen.set(key, value);
  }
  return seen;
}

/** Read presentation media tags, ignoring entries without exactly one valid `x` field. */
function presentationMedia(tag: string[]): ManifestMedia | null {
  const parsed = fields(tag);
  const hash = parsed?.get('x');
  if (!parsed || !hash || !isSha256(hash)) return null;
  const type = parsed.get('m');
  const dim = parsed.get('dim');
  return {
    sha256: hash,
    type: type && /^[a-z]+\/[a-z0-9.+-]+$/i.test(type) ? type.toLowerCase() : undefined,
    dim: dim && /^\d{1,5}x\d{1,5}$/.test(dim) ? dim : undefined,
    alt: parsed.get('alt')?.slice(0, 200),
  };
}

/**
 * Select signed current-format releases for this catalog; never execute their content.
 * @param input Untrusted relay event.
 * @param relays Relay hints to carry in the shareable address.
 * @returns A display entry, or null when it cannot be shown as a current release.
 * @example const app = catalogApp(event, ['wss://relay.example']);
 */
export function catalogApp(input: unknown, relays: string[] = []): CatalogApp | null {
  try {
    if (!validateEvent(input) || !verifyEvent(input as Event)) return null;
    const event = input as Event;
    if (!isValidNapplet(event)) return null;
    // The proposal's `x` tag is `["x", <sha256>]`; historical aggregate markers are not current releases.
    if (event.tags.some(tag => tag[0] === 'x' && tag.length !== 2)) return null;
    if (!Number.isSafeInteger(event.created_at) || event.created_at < 0 || event.created_at > 8_640_000_000_000) return null;
    const identifier = getNappletIdentifier(event) ?? '';
    const title = getNappletTitle(event)?.trim();
    const pointer = event.kind === 35129
      ? naddrEncode({ pubkey: event.pubkey, kind: event.kind, identifier, relays })
      : neventEncode({ id: event.id, author: event.pubkey, kind: event.kind, relays });
    const icon = getNappletIcon(event);
    const screenshots = event.tags.filter(tag => tag[0] === 'screenshot').map(presentationMedia).filter((media): media is ManifestMedia => media !== null);
    const previews = event.tags.filter(tag => tag[0] === 'preview');
    const preview = previews.length === 1 ? presentationMedia(previews[0]) ?? undefined : undefined;
    const unique = (values: string[]) => [...new Set(values.map(value => value.trim()).filter(Boolean))];
    return {
      id: event.kind === 5129 ? event.id : `${event.kind}:${event.pubkey}:${identifier}`,
      name: (title || identifier || 'Untitled napplet').slice(0, 100),
      description: event.content.slice(0, 1200), author: event.pubkey,
      publishedAt: event.created_at,
      requirements: unique(getNappletRequiredDomains(event)),
      optional: unique(getNappletOptionalDomains(event)),
      archetypes: unique(getNappletArchetypes(event)).slice(0, 6),
      topics: unique(event.tags.filter(tag => tag[0] === 't' && tag[1]).map(tag => tag[1].toLowerCase())).slice(0, 8),
      source: getNappletSource(event),
      servers: unique(getNappletServers(event)).filter(server => server.startsWith('https://')).slice(0, 6),
      icon: icon ? { sha256: icon.sha256, type: icon.type } : undefined,
      screenshots: screenshots.slice(0, 8),
      preview,
      coordinate: event.kind === 5129 ? undefined : `${event.kind}:${event.pubkey}:${identifier}`,
      pointer, event,
    };
  } catch { return null; }
}

/**
 * Retain the newest replaceable release; regular snapshots remain separate entries.
 * @param entries Verified display entries.
 * @returns Newest-first entries with deterministic same-timestamp tie breaking.
 * @example const apps = latestApps(releases);
 */
export function latestApps(entries: CatalogApp[]): CatalogApp[] {
  const byAddress = new Map<string, CatalogApp>();
  for (const entry of entries) {
    const old = byAddress.get(entry.id);
    if (!old || entry.publishedAt > old.publishedAt || (entry.publishedAt === old.publishedAt && entry.event.id < old.event.id)) byAddress.set(entry.id, entry);
  }
  return [...byAddress.values()].sort((a, b) => b.publishedAt - a.publishedAt || a.event.id.localeCompare(b.event.id));
}

const httpsUrl = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  try { return new URL(value).protocol === 'https:' ? value : undefined; } catch { return undefined; }
};

/**
 * Read a signed kind 32267 application listing for display. Markdown content is kept out; only tags are used.
 * @param input Untrusted relay event.
 * @returns Listing metadata, or null when the event is not a usable listing.
 * @example const listing = applicationListing(event);
 */
export function applicationListing(input: unknown): (Listing & { author: string; event: Event }) | null {
  try {
    if (!validateEvent(input) || !verifyEvent(input as Event)) return null;
    const event = input as Event;
    if (event.kind !== APPLICATION_KIND) return null;
    const value = (name: string) => event.tags.find(tag => tag[0] === name && tag[1])?.[1]?.trim();
    const id = value('d');
    const name = value('name');
    if (!id || !name) return null;
    return {
      id, name: name.slice(0, 100), summary: (value('summary') ?? '').slice(0, 300),
      icon: httpsUrl(value('icon')),
      images: event.tags.filter(tag => tag[0] === 'image').map(tag => httpsUrl(tag[1])).filter((url): url is string => Boolean(url)).slice(0, 6),
      topics: [...new Set(event.tags.filter(tag => tag[0] === 't' && tag[1]).map(tag => tag[1].trim().toLowerCase()))].slice(0, 8),
      website: httpsUrl(value('url')), repository: httpsUrl(value('repository')), license: value('license')?.slice(0, 40),
      publishedAt: event.created_at, author: event.pubkey, event,
    };
  } catch { return null; }
}

/**
 * Find the application listing that describes a napplet. This is a presentation heuristic, not protocol:
 * the listing must come from the same publisher and name the napplet by address, identifier prefix, or title.
 * @param app Verified catalog entry.
 * @param listings Verified listings from the same relays.
 * @returns The newest matching listing, if any.
 * @example const art = matchListing(app, listings)?.images[0];
 */
export function matchListing(app: CatalogApp, listings: ReturnType<typeof applicationListing>[]): Listing | undefined {
  const identifier = getNappletIdentifier(app.event);
  const title = app.name.toLocaleLowerCase();
  const matches = listings.filter((listing): listing is NonNullable<typeof listing> => {
    if (!listing || listing.author !== app.author) return false;
    const addresses = listing.event.tags.filter(tag => (tag[0] === 'latest' || tag[0] === 'a') && tag[1]).map(tag => tag[1]);
    if (app.coordinate && addresses.includes(app.coordinate)) return true;
    if (identifier && listing.id.startsWith(`${identifier}-`)) return true;
    return listing.name.toLocaleLowerCase() === title;
  }).sort((a, b) => b.publishedAt - a.publishedAt || a.event.id.localeCompare(b.event.id));
  const found = matches[0];
  if (!found) return undefined;
  const { author: _author, event: _event, ...listing } = found;
  return listing;
}

/**
 * Attach matching listings to catalog entries.
 * @param apps Verified catalog entries.
 * @param applications Untrusted kind 32267 events.
 * @returns The same entries with `listing` filled where a match exists.
 * @example const apps = withListings(latestApps(entries), snapshot.applications);
 */
export function withListings(apps: CatalogApp[], applications: unknown[]): CatalogApp[] {
  const listings = applications.map(applicationListing).filter(listing => listing !== null);
  return apps.map(app => ({ ...app, listing: matchListing(app, listings) }));
}

/** Whether a MIME type is one the catalog will decode and render. */
export function isImageType(type: string | undefined): type is ImageType {
  return (IMAGE_TYPES as readonly string[]).includes(type ?? '');
}
