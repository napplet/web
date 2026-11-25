// ─── Machine-readable surfaces ──────────────────────────────────────────────
// Markdown twins, llms.txt and JSON exports. Same data as the HTML pages, no JavaScript needed.

import type { ArchetypeEntry, ClusterEntry, IntentEntry, SiteIndex } from './model';
import { day, intentPath, kindLabel, plural, pointer, STATUS_LABEL } from './format';
import type { Snapshot } from './data';

const NON_NORMATIVE = 'Observed usage, not a registry. Archetypes and intents are ad hoc names chosen by napplet authors under NIP-5D (https://github.com/nostr-protocol/nips/pull/2303); intent dispatch follows NAP-INTENT (https://github.com/napplet/naps). Curation labels are editorial notes kept in this site’s repository, not protocol.';

/** Markdown-safe single line. */
const line = (text: string) => text.replace(/\s+/g, ' ').replace(/([\\`*_[\]<>])/g, '\\$1').trim();

/**
 * Markdown for one archetype page.
 * @param entry Archetype.
 * @param index Whole index, for intents and clusters.
 * @param site Site origin.
 * @returns Markdown document.
 * @example archetypeMarkdown(entry, index, 'https://archetypes.napplet.run')
 */
export function archetypeMarkdown(entry: ArchetypeEntry, index: SiteIndex, site: string): string {
  const intents = entry.intents.map(uri => index.intents.find(intent => intent.uri === uri)).filter((intent): intent is IntentEntry => Boolean(intent));
  const out = [
    `# ${entry.slug}`,
    '',
    `Observed archetype (${STATUS_LABEL[entry.status]}). ${plural(entry.napplets.length, 'napplet')}, ${plural(entry.publishers, 'publisher')}. First seen ${entry.firstSeen ? day(entry.firstSeen) : 'unknown'}, last seen ${entry.lastSeen ? day(entry.lastSeen) : 'unknown'}.`,
  ];
  if (entry.preferred) out.push('', `Coalesced: listed under ${entry.preferred}.`);
  if (entry.aliases.length) out.push('', `Also published as: ${entry.aliases.join(', ')}.`);
  if (entry.note) out.push('', `Curator note: ${line(entry.note)}`);
  out.push('', '## Manifest tags', '', '```', `["z", "${entry.slug}"]`, ...intents.map(intent => JSON.stringify(['i', intent.uri, ...intent.params.map(param => param.name)])), '```');
  out.push('', '## Intents', '');
  if (!intents.length) out.push('None advertised. Napplets with only a `z` tag can be listed but not addressed by intent.');
  for (const intent of intents) {
    const params = intent.params.length ? intent.params.map(param => `${param.name} (${param.count})`).join(', ') : 'none';
    out.push(`- ${intent.uri}: ${plural(intent.handlers.length, 'handler')}; parameter names: ${params}; ${site}${intentPath(intent.uri)}`);
  }
  const clusters = index.clusters.filter(cluster => cluster.members.includes(entry.slug));
  if (clusters.length) {
    out.push('', '## Clusters', '');
    for (const cluster of clusters) out.push(`- ${cluster.members.join(' ≈ ')} (${STATUS_LABEL[cluster.status === 'candidate' ? 'candidate' : cluster.status]}): ${site}/clusters/${cluster.id}/`);
  }
  if (entry.related.length) {
    out.push('', '## Nearby archetypes', '');
    for (const related of entry.related) out.push(`- ${related.slug}: ${line(related.detail)}`);
  }
  out.push('', '## Implementations', '');
  for (const napplet of entry.napplets) {
    out.push(`- ${line(napplet.title)} (${kindLabel(napplet.kind)}, ${day(napplet.createdAt)}): ${line(napplet.description).slice(0, 240)} — nostr:${pointer(napplet)}`);
  }
  out.push('', '---', '', NON_NORMATIVE, '', `HTML: ${site}/archetypes/${entry.slug}/`);
  return `${out.join('\n')}\n`;
}

/**
 * Markdown for the site's front page.
 * @param index Site index.
 * @param site Site origin.
 * @returns Markdown document.
 * @example indexMarkdown(index, site)
 */
export function indexMarkdown(index: SiteIndex, site: string): string {
  const out = [
    '# Napplet archetypes and intents',
    '',
    `What napplets say they do (\`z\` tags) and what you can ask them to do (\`i\` tags), as published on public Nostr relays. ${index.archetypes.length} archetypes, ${index.intents.length} intents, ${index.napplets} napplets from ${index.publishers} publishers. Data as of ${day(index.generatedAt)}.`,
    '',
    NON_NORMATIVE,
    '',
    '## Archetypes',
    '',
    ...index.archetypes.map(entry => `- [${entry.slug}](${site}/archetypes/${entry.slug}.md): ${plural(entry.napplets.length, 'napplet')}, ${plural(entry.intents.length, 'intent')}, ${STATUS_LABEL[entry.status]}`),
    '',
    '## Open synonym clusters',
    '',
    ...(index.clusters.filter(cluster => cluster.status === 'candidate').map(cluster => `- ${cluster.members.join(' ≈ ')}: ${site}/clusters/${cluster.id}/`)),
  ];
  return `${out.join('\n')}\n`;
}

/**
 * llms.txt: a short map of the site for language models.
 * @param index Site index.
 * @param site Site origin.
 * @returns Text in llms.txt format.
 * @example llmsTxt(index, site)
 */
export function llmsTxt(index: SiteIndex, site: string): string {
  return [
    '# Napplet archetypes',
    '',
    `> A field guide to the archetypes (\`z\` tags) and intents (\`i\` tags) napplet manifests advertise on public Nostr relays: ${index.archetypes.length} archetypes, ${index.intents.length} intents, ${index.napplets} napplets. Rebuilt daily; pages also merge newer relay data in the browser.`,
    '',
    NON_NORMATIVE,
    '',
    'Use this to pick an archetype name and intent for a new napplet that others already use, or to find napplets that accept an intent.',
    '',
    '## Data',
    '',
    `- [All archetypes, intents and clusters as JSON](${site}/archetypes.json)`,
    `- [Everything as one Markdown file](${site}/llms-full.txt)`,
    `- [Relays used for live updates](${site}/relays.json)`,
    `- [Agent guide](${site}/agents/)`,
    '',
    '## Archetypes',
    '',
    ...index.archetypes.map(entry => `- [${entry.slug}](${site}/archetypes/${entry.slug}.md): ${plural(entry.napplets.length, 'napplet')}; intents: ${entry.intents.length ? entry.intents.join(', ') : 'none'}`),
    '',
  ].join('\n');
}

/**
 * llms-full.txt: every archetype page concatenated.
 * @param index Site index.
 * @param site Site origin.
 * @returns Markdown.
 * @example llmsFullTxt(index, site)
 */
export function llmsFullTxt(index: SiteIndex, site: string): string {
  return [indexMarkdown(index, site), ...index.archetypes.map(entry => archetypeMarkdown(entry, index, site))].join('\n\n');
}

const clusterJson = (cluster: ClusterEntry) => ({
  id: cluster.id, members: cluster.members, status: cluster.status, score: cluster.score ?? null,
  signals: cluster.signals.map(signal => signal.detail), preferred: cluster.preferred ?? null, params: cluster.params, note: cluster.note ?? null,
});

/**
 * The build snapshot as JSON for tools: counts, intents, clusters and curation, without raw events.
 * @param index Site index.
 * @param snapshot Build snapshot.
 * @returns JSON-serialisable object.
 * @example archetypesJson(index, snapshot)
 */
export function archetypesJson(index: SiteIndex, snapshot: Snapshot) {
  return {
    about: NON_NORMATIVE,
    generatedAt: new Date(index.generatedAt * 1000).toISOString(),
    totals: { releases: index.releases, napplets: index.napplets, publishers: index.publishers, archetypes: index.archetypes.length, intents: index.intents.length, silentNapplets: index.silent },
    archetypes: index.archetypes.map(entry => ({
      slug: entry.slug, status: entry.status, napplets: entry.napplets.length, publishers: entry.publishers,
      intents: entry.intents,
      params: [...new Set(entry.intents.flatMap(uri => index.intents.find(intent => intent.uri === uri)?.params.map(param => param.name) ?? []))],
      preferred: entry.preferred ?? null, aliases: entry.aliases, note: entry.note ?? null,
      firstSeen: entry.firstSeen || null, lastSeen: entry.lastSeen || null, url: `${snapshot.siteUrl}/archetypes/${entry.slug}/`,
      implementations: entry.napplets.map(napplet => ({ title: napplet.title, kind: napplet.kind, pubkey: napplet.pubkey, pointer: pointer(napplet), createdAt: napplet.createdAt })),
    })),
    intents: index.intents.map(intent => ({
      uri: intent.uri, archetype: intent.archetype, verb: intent.verb, handlers: intent.handlers.length, publishers: intent.publishers,
      agreement: intent.agreement, params: intent.params,
    })),
    verbs: index.verbs,
    clusters: index.clusters.map(clusterJson),
    live: { relays: snapshot.runtime.relays, since: snapshot.generatedAt },
  };
}
