// Exhaustive `until` paging for Napshot label queries, shared by the store page and the showcase refresh script.
// The label profile belongs to napplet/napshot (NIP-32 kind 1985, `#screenshot`), not NIP-5D.

/**
 * Walk one relay's label history for a set of manifest ids until it is provably exhausted.
 * Each next page uses the previous page's oldest timestamp as an inclusive `until` and de-duplicates by id, so labels
 * sharing that timestamp are not skipped. A full page that adds nothing new is saturated at one timestamp: the targets
 * are split and each half is walked from that boundary, and a single target that still saturates is reported incomplete.
 * @template {{ id: string, created_at: number }} T
 * @param {(ids: string[], until: number | undefined) => Promise<{ events: T[], ok: boolean }>} request One relay query; `ok` is true when the relay reached EOSE.
 * @param {string[]} ids Manifest ids to request labels for.
 * @param {number} limit The request `limit`; a page this size may have more behind it.
 * @param {number} [until] Inclusive upper bound to start from; events newer than it were already collected.
 * @returns {Promise<boolean>} True only when every matching label at or before `until` was returned.
 * @example const complete = await exhaustLabels((ids, until) => query(url, ids, until), batch, 80);
 */
export async function exhaustLabels(request, ids, limit, until) {
  const seen = new Set();
  for (;;) {
    const page = await request(ids, until);
    let fresh = 0;
    for (const event of page.events) if (!seen.has(event.id)) { seen.add(event.id); fresh++; }
    if (!page.ok) return false;
    if (page.events.length < limit) return true;
    if (!fresh) {
      if (ids.length < 2) return false;
      const half = Math.ceil(ids.length / 2);
      const parts = await Promise.all([ids.slice(0, half), ids.slice(half)].map(part => exhaustLabels(request, part, limit, until)));
      return parts.every(Boolean);
    }
    until = Math.min(...page.events.map(event => event.created_at));
  }
}
