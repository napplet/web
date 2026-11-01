// Napshot label collection for the showcase snapshot: pure, testable batching, paging and
// trust handling. The network request is injected; see scripts/refresh-showcase-apps.mjs.
// The label profile belongs to napplet/napshot (NIP-32 kind 1985, `#screenshot`), not NIP-5D.

export const LABEL_KIND = 1985;
export const SCREENSHOT_NAMESPACE = '#screenshot';
/** Targets per request; relays cap single-letter tag arrays, and this stays well inside every limit. */
export const LABEL_BATCH = 50;

/**
 * Collect Napshot screenshot labels for saved manifests from every configured relay.
 * Targets are batched so each request's `#e` stays small, and a full page is paged with
 * `until` so a relay's request cap cannot silently drop candidates. Labels are accepted
 * only from the configured signers; previously saved labels from those signers are kept,
 * so a partial pass preserves the previews an earlier snapshot already shipped.
 * @param {function} request One relay query: `(url, filter) => Promise<{ events: unknown[], ok: boolean }>`, `ok` true when the relay reached EOSE.
 * @param {object} options `{ relays, labelers, targets, previous, limit }`.
 * @returns {Promise<{ labels: unknown[], complete: number, batches: number }>} Unique trusted labels and how many batches finished on at least one relay.
 * @example const { labels, complete, batches } = await collectLabels(request, { relays, labelers, targets, previous: saved.labels, limit: 80 });
 */
export async function collectLabels(request, { relays, labelers, targets, previous = [], limit }) {
  const labels = new Map(previous.filter(event => labelers.includes(event.pubkey)).map(event => [event.id, event]));
  if (!labelers.length || !targets.length) return { labels: [...labels.values()], complete: 0, batches: 0 };
  let complete = 0;
  let batches = 0;
  for (let index = 0; index < targets.length; index += LABEL_BATCH) {
    const ids = targets.slice(index, index + LABEL_BATCH);
    const found = new Map();
    let batchComplete = false;
    let until;
    batches++;
    for (;;) {
      const filter = { kinds: [LABEL_KIND], authors: labelers, '#L': [SCREENSHOT_NAMESPACE], '#e': ids, limit, ...(until !== undefined ? { until } : {}) };
      const pages = await Promise.all(relays.map(url => request(url, filter)));
      const events = pages.flatMap(page => page.events);
      for (const event of events) if (labelers.includes(event.pubkey)) found.set(event.id, event);
      if (pages.some(page => page.ok)) batchComplete = true;
      // A full page from a relay that reached EOSE has more behind it; a short page, or none finishing, ends the batch.
      if (!events.length || !pages.some(page => page.ok && page.events.length >= limit)) break;
      until = Math.min(...events.map(event => event.created_at)) - 1;
    }
    if (batchComplete) complete++;
    for (const event of found.values()) labels.set(event.id, event);
  }
  return { labels: [...labels.values()], complete, batches };
}