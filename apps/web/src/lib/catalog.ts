/** Catalog presentation, not a conformance validator. Living NIP-5D governs manifests. */
import { validateEvent, verifyEvent, type Event } from 'nostr-tools/pure';
import { naddrEncode, neventEncode } from 'nostr-tools/nip19';

export interface CatalogApp {
  id: string;
  name: string;
  description: string;
  author: string;
  publishedAt: number;
  requirements: string[];
  pointer: string;
  event: Event;
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
    if (![5129, 15129, 35129].includes(event.kind) || !event.content.trim()) return null;
    if (!Number.isSafeInteger(event.created_at) || event.created_at < 0 || event.created_at > 8_640_000_000_000) return null;
    const hashes = event.tags.filter(tag => tag[0] === 'x');
    const identifiers = event.tags.filter(tag => tag[0] === 'd');
    if (hashes.length !== 1 || hashes[0].length !== 2 || !/^[a-f0-9]{64}$/.test(hashes[0][1])) return null;
    if (event.kind === 35129 ? identifiers.length !== 1 : identifiers.length !== 0) return null;
    const identifier = identifiers[0]?.[1] ?? '';
    const title = event.tags.find(tag => tag[0] === 'title')?.[1]?.trim();
    const pointer = event.kind === 35129
      ? naddrEncode({ pubkey: event.pubkey, kind: event.kind, identifier, relays })
      : neventEncode({ id: event.id, author: event.pubkey, kind: event.kind, relays });
    return {
      id: event.kind === 5129 ? event.id : `${event.kind}:${event.pubkey}:${identifier}`,
      name: (title || identifier || 'Untitled napplet').slice(0, 100),
      description: event.content.slice(0, 1200), author: event.pubkey,
      publishedAt: event.created_at,
      requirements: [...new Set(event.tags.filter(tag => tag[0] === 'R').map(tag => tag[1]).filter(Boolean))],
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
