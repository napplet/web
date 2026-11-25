export interface SearchableArchetype {
  slug: string;
  status: string;
  intents: string[];
  aliases: string[];
  note?: string | null;
  /** Parameter names across the archetype's intents. */
  params?: string[];
  napplets: number | unknown[];
}

const count = (value: number | unknown[]) => (Array.isArray(value) ? value.length : value);

/**
 * Text an archetype can be found by: its name, aliases, intents, parameter names and note.
 * @param entry Archetype.
 * @returns Lower-case haystack.
 * @example haystack({ slug: 'note', intents: ['napplet:note/open'], aliases: [], status: 'observed', napplets: 1 })
 */
export function haystack(entry: SearchableArchetype): string {
  return [entry.slug, ...entry.aliases, ...entry.intents, ...(entry.params ?? []), entry.note ?? ''].join(' ').toLowerCase();
}

/**
 * Archetypes matching every word of the query, exact names first, then by napplet count.
 * @param entries Archetypes.
 * @param query Free text.
 * @returns Matches; everything when the query is blank.
 * @example searchArchetypes(entries, 'editor')
 */
export function searchArchetypes<T extends SearchableArchetype>(entries: T[], query: string): T[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return entries;
  const scored = entries
    .map(entry => ({ entry, text: haystack(entry) }))
    .filter(({ text }) => terms.every(term => text.includes(term)))
    .map(({ entry }) => ({ entry, rank: entry.slug === query.trim().toLowerCase() ? 0 : entry.slug.includes(terms[0]) ? 1 : 2 }));
  return scored.sort((a, b) => a.rank - b.rank || count(b.entry.napplets) - count(a.entry.napplets) || a.entry.slug.localeCompare(b.entry.slug)).map(({ entry }) => entry);
}
