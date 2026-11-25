import { validateEvent, verifyEvent, type Event } from 'nostr-tools/pure';
import type { Filter } from 'nostr-tools/filter';

export interface QueryOptions {
  timeoutMs: number;
  maxFrameBytes: number;
  /** Injected for tests; defaults to the platform WebSocket. */
  WebSocketImpl?: typeof WebSocket;
}

export interface QueryResult {
  events: Event[];
  /** The relay answered the request completely (EOSE). */
  ok: boolean;
  /** A socket opened. False means the relay could not be reached at all. */
  connected: boolean;
  error?: string;
}

/** Query function shape, injectable so crawl logic is testable without sockets. */
export type Query = (url: string, filter: Filter) => Promise<QueryResult>;

/**
 * Accept only well-formed, correctly signed events of the requested kinds.
 * @param input Untrusted event from a relay frame.
 * @param kinds Kinds the request asked for.
 * @returns The event, or null.
 * @example acceptEvent(frame[2], [35129])
 */
export function acceptEvent(input: unknown, kinds?: number[]): Event | null {
  try {
    if (!validateEvent(input)) return null;
    const { id, pubkey, created_at, kind, tags, content, sig } = input as Event;
    if (kinds && !kinds.includes(kind)) return null;
    // A fresh object: nostr-tools caches a passed check on the object it verified, and a copy would inherit it.
    const event: Event = { id, pubkey, created_at, kind, tags, content, sig };
    if (!verifyEvent(event)) return null;
    return event;
  } catch { return null; }
}

/**
 * Send one REQ and collect matching events until EOSE, CLOSED, an error or the timeout.
 * @param url Relay URL.
 * @param filter One NIP-01 filter.
 * @param options Timeout, frame cap and optional WebSocket implementation.
 * @returns Verified events and whether the relay completed the request.
 * @example const { events, ok } = await queryRelay('wss://relay.example', { kinds: [35129] }, { timeoutMs: 10000, maxFrameBytes: 524288 });
 */
export function queryRelay(url: string, filter: Filter, options: QueryOptions): Promise<QueryResult> {
  const Impl = options.WebSocketImpl ?? globalThis.WebSocket;
  return new Promise(resolve => {
    const events = new Map<string, Event>();
    const subId = `q${Math.random().toString(36).slice(2, 10)}`;
    let connected = false;
    let settled = false;
    let socket: WebSocket;
    const finish = (ok: boolean, error?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        if (connected && socket.readyState === 1) socket.send(JSON.stringify(['CLOSE', subId]));
        socket.close();
      } catch { /* the socket may already be gone */ }
      resolve({ events: [...events.values()], ok, connected, ...(error ? { error } : {}) });
    };
    const timer = setTimeout(() => finish(false, connected ? 'timeout' : 'connect-timeout'), options.timeoutMs);
    try {
      socket = new Impl(url);
    } catch (error) {
      clearTimeout(timer);
      resolve({ events: [], ok: false, connected: false, error: String(error) });
      return;
    }
    socket.onopen = () => {
      connected = true;
      socket.send(JSON.stringify(['REQ', subId, filter]));
    };
    socket.onerror = () => finish(false, connected ? 'socket-error' : 'connect-failed');
    socket.onclose = () => finish(false, connected ? 'closed-early' : 'connect-failed');
    socket.onmessage = message => {
      const data = typeof message.data === 'string' ? message.data : '';
      if (!data || data.length > options.maxFrameBytes) return;
      let frame: unknown;
      try { frame = JSON.parse(data); } catch { return; }
      if (!Array.isArray(frame) || frame[1] !== subId) return;
      if (frame[0] === 'EVENT') {
        const event = acceptEvent(frame[2], filter.kinds);
        if (event) events.set(event.id, event);
      } else if (frame[0] === 'EOSE') {
        finish(true);
      } else if (frame[0] === 'CLOSED') {
        finish(false, `closed: ${String(frame[2] ?? '').slice(0, 200)}`);
      }
    };
  });
}

export interface PageResult {
  events: Event[];
  ok: boolean;
  connected: boolean;
  error?: string;
}

/**
 * Page one relay backwards with `until` until a page is empty, a request fails, or the cap is hit.
 * Each page re-reads the previous oldest second inclusively and de-duplicates by id; a page that adds
 * nothing steps one second past it.
 * @param query Injected single-request function.
 * @param url Relay URL.
 * @param filter Base filter (kinds, since, tags); `until` and `limit` are managed here.
 * @param limit Page size.
 * @param maxEvents Cap on distinct events.
 * @returns Unique events and the relay's reachability.
 * @example await pageRelay(query, 'wss://relay.example', { kinds: [35129] }, 500, 5000);
 */
export async function pageRelay(query: Query, url: string, filter: Filter, limit: number, maxEvents: number): Promise<PageResult> {
  const found = new Map<string, Event>();
  let until: number | undefined;
  let ok = false;
  let connected = false;
  let error: string | undefined;
  while (found.size < maxEvents) {
    const result = await query(url, { ...filter, limit, ...(until !== undefined ? { until } : {}) });
    connected ||= result.connected;
    if (!result.ok) { error = result.error; ok = false; break; }
    ok = true;
    if (!result.events.length) break;
    const fresh = result.events.filter(event => !found.has(event.id));
    for (const event of fresh) found.set(event.id, event);
    const oldest = Math.min(...result.events.map(event => event.created_at));
    if (filter.since !== undefined && oldest <= filter.since && !fresh.length) break;
    until = fresh.length ? oldest : oldest - 1;
    if (filter.since !== undefined && until < filter.since) break;
  }
  return { events: [...found.values()].slice(0, maxEvents), ok, connected, ...(error ? { error } : {}) };
}
