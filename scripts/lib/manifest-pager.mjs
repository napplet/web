// Exhaustive `until` paging for one relay's NIP-5D manifest history, used by scripts/refresh-showcase-apps.mjs.
// The network request is injected so the stop rule can be tested without a relay.

/**
 * Page one relay backwards with `until` until it runs out of manifests or the cap is reached.
 * Each next page re-reads the previous page's oldest timestamp inclusively and de-duplicates by id, so manifests
 * sharing that second are not skipped. A page shorter than `limit` is not the end of the relay's history, because the
 * caller's `request` may drop oversized or unverifiable frames and relays may return fewer events than asked. When a
 * page adds nothing new, every event on it sits at the boundary second and was already seen (or dropped), so the walk
 * steps one second past it; only a second holding more matching events than `limit` can lose events this way. The
 * walk ends on an empty page, a failed request, or the cap.
 * @param {function} request One relay query: `(url, filter) => Promise<{ events: unknown[], ok: boolean }>`, `ok` true when the relay reached EOSE.
 * @param {object} options `{ url, kinds, limit, maxEvents }`.
 * @returns {Promise<{ url: string, ok: boolean, events: unknown[] }>} Unique events and whether any page reached EOSE.
 * @example const { url, ok, events } = await pageManifests(request, { url: 'wss://relay.example', kinds: [5129, 15129, 35129], limit: 80, maxEvents: 2000 });
 */
export async function pageManifests(request, { url, kinds, limit, maxEvents }) {
  const found = new Map();
  let until;
  let ok = false;
  while (found.size < maxEvents) {
    const filter = { kinds, limit, ...(until !== undefined ? { until } : {}) };
    const result = await request(url, filter);
    ok ||= result.ok;
    const fresh = result.events.filter(event => !found.has(event.id));
    fresh.forEach(event => found.set(event.id, event));
    if (!result.ok || !result.events.length) break;
    const oldest = Math.min(...result.events.map(event => event.created_at));
    until = fresh.length ? oldest : oldest - 1;
  }
  return { url, ok, events: [...found.values()] };
}
