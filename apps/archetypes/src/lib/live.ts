import { verifyEvent, type Event } from 'nostr-tools/pure';
import { MANIFEST_KINDS, parseRelease, type NostrEvent, type Release } from './release';

/** What a page tells the browser about its build. */
export interface LiveContext {
  generatedAt: number;
  relays: string[];
  timeoutMs: number;
  /** Archetype → napplet keys the build already lists. */
  known: Record<string, string[]>;
  /** Intent URIs the build already lists. */
  intents: string[];
}

export interface LiveNapplet { key: string; title: string; archetypes: string[]; intents: string[]; createdAt: number }

export interface LiveDiff {
  /** Manifests newer than the build. */
  releases: number;
  /** Napplets the build did not list under at least one of their archetypes. */
  napplets: LiveNapplet[];
  /** Archetype → napplets new to it, and whether the build had never seen the archetype. */
  archetypes: Record<string, { added: LiveNapplet[]; isNew: boolean }>;
  /** Intent URIs the build had never seen. */
  intents: string[];
}

/**
 * Accept a relay event only if it is a well-formed, correctly signed manifest.
 * @param input Untrusted relay payload.
 * @returns The event, or null.
 * @example verifiedManifest(frame[2])
 */
export function verifiedManifest(input: unknown): NostrEvent | null {
  try {
    const raw = input as Partial<Event>;
    if (!raw || typeof raw !== 'object' || !(MANIFEST_KINDS as readonly number[]).includes(Number(raw.kind))) return null;
    const { id, pubkey, created_at, kind, tags, content, sig } = raw as Event;
    const event: Event = { id, pubkey, created_at, kind, tags, content, sig };
    return verifyEvent(event) ? event : null;
  } catch { return null; }
}

/**
 * Work out what newer manifests add to a built page.
 * @param context The build's known archetypes and intents.
 * @param events Verified manifests from relays.
 * @returns Additions grouped by archetype.
 * @example diffLive(context, events)
 */
export function diffLive(context: LiveContext, events: NostrEvent[]): LiveDiff {
  const newest = new Map<string, Release>();
  for (const event of events) {
    if (event.created_at <= context.generatedAt) continue;
    const release = parseRelease(event);
    if (!release) continue;
    const old = newest.get(release.key);
    if (!old || release.createdAt > old.createdAt) newest.set(release.key, release);
  }
  const knownIntents = new Set(context.intents);
  const archetypes: LiveDiff['archetypes'] = {};
  const napplets = new Map<string, LiveNapplet>();
  const intents = new Set<string>();
  for (const release of newest.values()) {
    const live: LiveNapplet = { key: release.key, title: release.title, archetypes: release.archetypes, intents: release.intents.map(intent => intent.uri), createdAt: release.createdAt };
    const ids = [release.key, release.parent, release.root].filter(Boolean) as string[];
    for (const slug of release.archetypes) {
      const known = context.known[slug];
      if (known && ids.some(id => known.includes(id))) continue;
      const entry = archetypes[slug] ?? { added: [], isNew: !known };
      entry.added.push(live);
      archetypes[slug] = entry;
      napplets.set(live.key, live);
    }
    for (const intent of release.intents) if (!knownIntents.has(intent.uri)) intents.add(intent.uri);
  }
  return { releases: newest.size, napplets: [...napplets.values()], archetypes, intents: [...intents].sort() };
}

/**
 * Ask each relay once for manifests newer than the build; bounded by count and time.
 * @param relays Relay URLs from the build.
 * @param since Build time (unix seconds).
 * @param timeoutMs Per-relay wait.
 * @param WebSocketImpl Injected for tests.
 * @returns Verified manifests (deduplicated) and how many relays answered.
 * @example await fetchLive(['wss://relay.example'], 1700000000, 8000)
 */
export async function fetchLive(relays: string[], since: number, timeoutMs: number, WebSocketImpl: typeof WebSocket = WebSocket): Promise<{ events: NostrEvent[]; answered: number }> {
  const found = new Map<string, NostrEvent>();
  let answered = 0;
  await Promise.all(relays.map(url => new Promise<void>(resolve => {
    let socket: WebSocket;
    const sub = `live${Math.random().toString(36).slice(2, 8)}`;
    const done = () => { clearTimeout(timer); try { socket.close(); } catch { /* already closed */ } resolve(); };
    const timer = setTimeout(done, timeoutMs);
    try { socket = new WebSocketImpl(url); } catch { clearTimeout(timer); resolve(); return; }
    socket.onopen = () => socket.send(JSON.stringify(['REQ', sub, { kinds: [...MANIFEST_KINDS], since: since + 1, limit: 500 }]));
    socket.onerror = done;
    socket.onmessage = message => {
      if (typeof message.data !== 'string' || message.data.length > 512 * 1024) return;
      let frame: unknown;
      try { frame = JSON.parse(message.data); } catch { return; }
      if (!Array.isArray(frame) || frame[1] !== sub) return;
      if (frame[0] === 'EVENT') {
        const event = verifiedManifest(frame[2]);
        if (event && found.size < 2000) found.set(event.id, event);
      } else if (frame[0] === 'EOSE' || frame[0] === 'CLOSED') {
        if (frame[0] === 'EOSE') answered++;
        done();
      }
    };
  })));
  return { events: [...found.values()], answered };
}
