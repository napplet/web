// Napshot label collection for the showcase snapshot: pure, testable batching, paging and
// trust handling. The network request is injected; see scripts/refresh-showcase-apps.mjs.
// The label profile belongs to napplet/napshot (NIP-32 kind 1985, `#screenshot`), not NIP-5D.
import { exhaustLabels } from '../../apps/web/src/lib/label-pager.mjs';

export const LABEL_KIND = 1985;
export const SCREENSHOT_NAMESPACE = '#screenshot';
/** Targets per request; relays cap single-letter tag arrays, and this stays well inside every limit. */
export const LABEL_BATCH = 50;

/**
 * Collect Napshot screenshot labels for saved manifests from every configured relay.
 * Targets are batched so each request's `#e` stays small, and each relay is paged with an
 * inclusive `until` (see exhaustLabels) so neither its request cap nor labels sharing a
 * page-boundary timestamp can silently drop candidates. Labels are accepted
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
    batches++;
    const completed = await Promise.all(relays.map(url => exhaustLabels(async (batch, until) => {
      const filter = { kinds: [LABEL_KIND], authors: labelers, '#L': [SCREENSHOT_NAMESPACE], '#e': batch, limit, ...(until !== undefined ? { until } : {}) };
      const page = await request(url, filter);
      for (const event of page.events) if (labelers.includes(event.pubkey)) found.set(event.id, event);
      return page;
    }, ids, limit)));
    if (completed.some(Boolean)) complete++;
    for (const event of found.values()) labels.set(event.id, event);
  }
  return { labels: [...labels.values()], complete, batches };
}
