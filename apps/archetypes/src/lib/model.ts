// ─── Archetype and intent index ─────────────────────────────────────────────
// Turns signed manifests into what the site shows: archetypes, intents, verbs,
// synonym clusters. Shared by the static build and the browser's live top-up.

import { parseRelease, SLUG, type NostrEvent, type Release } from './release';
import { candidatePairs, scorePair, words, type ArchetypeProfile, type Signal } from './similarity';
import { EMPTY_CURATION, type ClusterOutcome, type Curation, type ParamAlignment } from './curation';

export interface NappletRef {
  key: string;
  id: string;
  kind: number;
  pubkey: string;
  identifier: string;
  title: string;
  description: string;
  createdAt: number;
  /** Earliest release of this napplet in the store. */
  firstSeen: number;
  requires: string[];
  optional: string[];
  archetypes: string[];
  intents: string[];
  /** Snapshot releases folded into this napplet. */
  versions: number;
  relays: string[];
}

export type Status = 'observed' | 'candidate' | 'coalesced' | 'diverse';

export interface ArchetypeEntry {
  slug: string;
  /** Napplets advertising `["z", slug]`, newest first. */
  napplets: NappletRef[];
  publishers: number;
  /** Intent URIs under this archetype, most handlers first. */
  intents: string[];
  firstSeen: number;
  lastSeen: number;
  status: Status;
  note?: string;
  reviewed?: string;
  /** When coalesced: the preferred name of the group. */
  preferred?: string;
  /** Other names coalesced with this one. */
  aliases: string[];
  clusters: string[];
  related: Array<{ slug: string; detail: string }>;
}

export interface Handler { napplet: NappletRef; params: string[]; advertisesArchetype: boolean; since: number }

export interface IntentEntry {
  uri: string;
  archetype: string;
  verb: string;
  handlers: Handler[];
  /** Parameter names with how many handlers advertise each. */
  params: Array<{ name: string; count: number }>;
  /** Whether every handler advertises the same parameter names. */
  agreement: 'single' | 'unanimous' | 'mixed';
  publishers: number;
}

export interface ClusterEntry {
  id: string;
  members: string[];
  score?: number;
  signals: Signal[];
  status: 'candidate' | ClusterOutcome;
  preferred?: string;
  params: ParamAlignment[];
  note?: string;
  reviewed?: string;
  /** One row per parameter meaning: member → names it advertises for that meaning. */
  paramRows: Array<{ names: Record<string, string[]>; note?: string; aligned: boolean }>;
}

export interface VerbEntry { verb: string; archetypes: string[]; handlers: number }

export interface SiteIndex {
  generatedAt: number;
  releases: number;
  napplets: number;
  publishers: number;
  archetypes: ArchetypeEntry[];
  intents: IntentEntry[];
  clusters: ClusterEntry[];
  verbs: VerbEntry[];
  /** Napplets that advertise nothing addressable. */
  silent: number;
}

const PRECEDENCE: Record<number, number> = { 15129: 0, 35129: 1, 5129: 2 };
const byNewest = (a: { createdAt: number; id: string }, b: { createdAt: number; id: string }) => b.createdAt - a.createdAt || a.id.localeCompare(b.id);

/**
 * Keep the newest release per napplet key, then fold snapshots into the napplet they pin.
 * A snapshot joins the root or named napplet its `a`, then `A`, lineage names, else the same publisher's
 * napplet with the same title; otherwise it stays its own napplet.
 * @param releases Every parsed release, including superseded revisions.
 * @returns Families: the head release, the members, and the earliest release time.
 * @example families(releases)
 */
export function families(releases: Release[]): Array<{ head: Release; members: Release[]; firstSeen: number }> {
  const latest = new Map<string, Release>();
  const earliest = new Map<string, number>();
  for (const release of releases) {
    const old = latest.get(release.key);
    if (!old || byNewest(release, old) < 0) latest.set(release.key, release);
    earliest.set(release.key, Math.min(earliest.get(release.key) ?? Infinity, release.createdAt));
  }
  const current = [...latest.values()];
  const addressable = new Map(current.filter(release => release.kind !== 5129).map(release => [release.key, release]));
  const byTitle = new Map<string, string>();
  for (const release of current) {
    const family = `${release.pubkey}|${release.title.toLowerCase()}`;
    if (release.kind !== 5129 && !byTitle.has(family)) byTitle.set(family, release.key);
  }
  const groups = new Map<string, Release[]>();
  for (const release of current) {
    let group = release.key;
    if (release.kind === 5129) {
      group = (release.parent && addressable.has(release.parent) && release.parent)
        || (release.root && addressable.has(release.root) && release.root)
        || release.parent || release.root
        || byTitle.get(`${release.pubkey}|${release.title.toLowerCase()}`)
        || release.key;
    }
    groups.set(group, [...(groups.get(group) ?? []), release]);
  }
  return [...groups.values()].map(members => {
    const [head] = [...members].sort((a, b) => PRECEDENCE[a.kind] - PRECEDENCE[b.kind] || byNewest(a, b));
    return { head, members, firstSeen: Math.min(...members.map(member => earliest.get(member.key) ?? member.createdAt)) };
  });
}

function ref(head: Release, members: Release[], firstSeen: number): NappletRef {
  return {
    key: head.key, id: head.id, kind: head.kind, pubkey: head.pubkey, identifier: head.identifier,
    title: head.title, description: head.description, createdAt: Math.max(...members.map(member => member.createdAt)),
    firstSeen, requires: head.requires, optional: head.optional, archetypes: head.archetypes,
    intents: head.intents.map(intent => intent.uri), versions: members.filter(member => member !== head && member.kind === 5129).length,
    relays: head.relays,
  };
}

/**
 * Build the whole site index from signed manifests and curation.
 * @param events Manifest events (signatures already verified).
 * @param options Relay hints per event id, curation and the build time.
 * @returns The index every page renders from.
 * @example buildIndex(snapshot.events, { relayHints: snapshot.relayHints, curation, generatedAt: snapshot.generatedAt })
 */
export function buildIndex(events: NostrEvent[], options: { relayHints?: Record<string, string[]>; curation?: Curation; generatedAt?: number } = {}): SiteIndex {
  const curation = options.curation ?? EMPTY_CURATION;
  const releases = events.map(event => parseRelease(event, options.relayHints?.[event.id] ?? [])).filter((release): release is Release => release !== null);
  const fams = families(releases);
  const refs = fams.map(family => ({ ...family, ref: ref(family.head, family.members, family.firstSeen) }));

  // When each napplet first advertised an archetype or intent, across its whole history.
  const byKey = new Map<string, Release[]>();
  for (const release of releases) byKey.set(release.key, [...(byKey.get(release.key) ?? []), release]);
  const firstAdvertised = (family: { members: Release[] }, test: (release: Release) => boolean, fallback: number) => {
    const times = family.members.flatMap(member => byKey.get(member.key) ?? []).filter(test).map(release => release.createdAt);
    return times.length ? Math.min(...times) : fallback;
  };

  const archetypeNapplets = new Map<string, Array<{ ref: NappletRef; since: number }>>();
  const intentHandlers = new Map<string, Handler[]>();
  for (const family of refs) {
    for (const slug of family.head.archetypes) {
      const since = firstAdvertised(family, release => release.archetypes.includes(slug), family.ref.createdAt);
      archetypeNapplets.set(slug, [...(archetypeNapplets.get(slug) ?? []), { ref: family.ref, since }]);
    }
    for (const intent of family.head.intents) {
      const since = firstAdvertised(family, release => release.intents.some(other => other.uri === intent.uri), family.ref.createdAt);
      intentHandlers.set(intent.uri, [...(intentHandlers.get(intent.uri) ?? []), {
        napplet: family.ref, params: intent.params, advertisesArchetype: family.head.archetypes.includes(intent.archetype), since,
      }]);
    }
  }

  // Intents.
  const intents: IntentEntry[] = [...intentHandlers].map(([uri, handlers]) => {
    const [, path] = uri.split(':');
    const [archetype, verb] = path.split('/');
    const counts = new Map<string, number>();
    for (const handler of handlers) for (const param of handler.params) counts.set(param, (counts.get(param) ?? 0) + 1);
    const signatures = new Set(handlers.map(handler => [...handler.params].sort().join(' ')));
    return {
      uri, archetype, verb,
      handlers: [...handlers].sort((a, b) => a.since - b.since || a.napplet.title.localeCompare(b.napplet.title)),
      params: [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      agreement: handlers.length === 1 ? 'single' : signatures.size === 1 ? 'unanimous' : 'mixed',
      publishers: new Set(handlers.map(handler => handler.napplet.pubkey)).size,
    } satisfies IntentEntry;
  }).sort((a, b) => b.handlers.length - a.handlers.length || a.uri.localeCompare(b.uri));

  // Archetype slugs: anything advertised by `z`, plus archetypes only reachable through an intent.
  const slugs = new Set([...archetypeNapplets.keys(), ...intents.map(intent => intent.archetype)]);

  // Verbs across archetypes.
  const verbMap = new Map<string, { archetypes: Set<string>; handlers: number }>();
  for (const intent of intents) {
    const entry = verbMap.get(intent.verb) ?? { archetypes: new Set<string>(), handlers: 0 };
    entry.archetypes.add(intent.archetype);
    entry.handlers += intent.handlers.length;
    verbMap.set(intent.verb, entry);
  }
  const verbs: VerbEntry[] = [...verbMap].map(([verb, entry]) => ({ verb, archetypes: [...entry.archetypes].sort(), handlers: entry.handlers }))
    .sort((a, b) => b.archetypes.length - a.archetypes.length || b.handlers - a.handlers || a.verb.localeCompare(b.verb));
  const commonVerb = verbs[0]?.verb ?? 'open';

  // Similarity profiles.
  const profiles = new Map<string, ArchetypeProfile>();
  for (const slug of slugs) {
    const napplets = archetypeNapplets.get(slug) ?? [];
    const own = intents.filter(intent => intent.archetype === slug);
    const text = napplets.map(entry => entry.ref.description).join(' ');
    profiles.set(slug, {
      slug,
      napplets: new Set([...napplets.map(entry => entry.ref.key), ...own.flatMap(intent => intent.handlers.filter(handler => handler.advertisesArchetype).map(handler => handler.napplet.key))]),
      publishers: new Set([...napplets.map(entry => entry.ref.pubkey), ...own.flatMap(intent => intent.handlers.map(handler => handler.napplet.pubkey))]),
      verbs: new Set(own.map(intent => intent.verb)),
      params: new Set(own.flatMap(intent => intent.params.map(param => param.name))),
      words: words(text),
    });
  }

  // Clusters: detected candidates, then curator decisions on top.
  const pairs = candidatePairs([...profiles.values()], curation.similarity, commonVerb);
  const curatedKey = (members: string[]) => [...members].sort().join('+');
  const decided = new Set<string>();
  for (const cluster of curation.clusters) {
    for (let i = 0; i < cluster.members.length; i++) for (let j = i + 1; j < cluster.members.length; j++) decided.add(curatedKey([cluster.members[i], cluster.members[j]]));
  }
  const adjacency = new Map<string, Set<string>>();
  for (const pair of pairs) {
    if (decided.has(curatedKey([pair.a, pair.b]))) continue;
    adjacency.set(pair.a, (adjacency.get(pair.a) ?? new Set()).add(pair.b));
    adjacency.set(pair.b, (adjacency.get(pair.b) ?? new Set()).add(pair.a));
  }
  const visited = new Set<string>();
  const detected: string[][] = [];
  for (const start of [...adjacency.keys()].sort()) {
    if (visited.has(start)) continue;
    const component: string[] = [];
    const stack = [start];
    while (stack.length) {
      const node = stack.pop() as string;
      if (visited.has(node)) continue;
      visited.add(node);
      component.push(node);
      for (const next of adjacency.get(node) ?? []) if (!visited.has(next)) stack.push(next);
    }
    detected.push(component.sort());
  }
  const paramRows = (members: string[], alignments: ParamAlignment[]) => {
    const rows: ClusterEntry['paramRows'] = [];
    const used = new Set<string>();
    for (const alignment of alignments) {
      const names: Record<string, string[]> = {};
      for (const member of members) {
        const own = profiles.get(member)?.params ?? new Set<string>();
        names[member] = alignment.same.filter(name => own.has(name));
        names[member].forEach(name => used.add(`${member}:${name}`));
      }
      rows.push({ names, ...(alignment.note ? { note: alignment.note } : {}), aligned: true });
    }
    const all = new Set(members.flatMap(member => [...(profiles.get(member)?.params ?? [])]));
    for (const name of [...all].sort()) {
      const names: Record<string, string[]> = {};
      let any = false;
      for (const member of members) {
        const has = profiles.get(member)?.params.has(name) && !used.has(`${member}:${name}`);
        names[member] = has ? [name] : [];
        any ||= Boolean(has);
      }
      if (any) rows.push({ names, aligned: false });
    }
    return rows;
  };
  const pairSignals = (members: string[]) => {
    const signals: Signal[] = [];
    let best = 0;
    for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) {
      const a = profiles.get(members[i]);
      const b = profiles.get(members[j]);
      if (!a || !b) continue;
      const pair = scorePair(a, b, curation.similarity, commonVerb);
      best = Math.max(best, pair.score);
      for (const signal of pair.signals) if (!signals.some(s => s.kind === signal.kind && s.detail === signal.detail)) signals.push(signal);
    }
    return { signals, score: best };
  };
  const clusters: ClusterEntry[] = [
    ...curation.clusters.map(cluster => {
      const { signals, score } = pairSignals(cluster.members);
      return {
        id: cluster.members.join('~'), members: cluster.members, score, signals, status: cluster.outcome,
        ...(cluster.preferred ? { preferred: cluster.preferred } : {}), params: cluster.params,
        ...(cluster.note ? { note: cluster.note } : {}), ...(cluster.reviewed ? { reviewed: cluster.reviewed } : {}),
        paramRows: paramRows(cluster.members, cluster.params),
      } satisfies ClusterEntry;
    }),
    ...detected.map(members => {
      const { signals, score } = pairSignals(members);
      return { id: members.join('~'), members, score, signals, status: 'candidate' as const, params: [], paramRows: paramRows(members, []) };
    }),
  ].sort((a, b) => Number(a.status !== 'candidate') - Number(b.status !== 'candidate') || (b.score ?? 0) - (a.score ?? 0) || a.id.localeCompare(b.id));

  // Archetype entries.
  const archetypes: ArchetypeEntry[] = [...slugs].map(slug => {
    const napplets = (archetypeNapplets.get(slug) ?? []).map(entry => entry.ref).sort(byNewest);
    const since = (archetypeNapplets.get(slug) ?? []).map(entry => entry.since);
    const own = intents.filter(intent => intent.archetype === slug);
    const fallbackTimes = own.flatMap(intent => intent.handlers.map(handler => handler.since));
    const memberOf = clusters.filter(cluster => cluster.members.includes(slug));
    const coalesced = memberOf.find(cluster => cluster.status === 'coalesce');
    const note = curation.archetypes[slug];
    let status: Status = 'observed';
    if (note?.status === 'diverse' || memberOf.some(cluster => cluster.status === 'diverse')) status = 'diverse';
    if (coalesced) status = 'coalesced';
    else if (memberOf.some(cluster => cluster.status === 'candidate') && status !== 'diverse') status = 'candidate';
    const profile = profiles.get(slug) as ArchetypeProfile;
    const related = [...profiles.values()]
      .filter(other => other.slug !== slug)
      .map(other => scorePair(profile, other, curation.similarity, commonVerb))
      .filter(pair => pair.together || (pair.signals.length && pair.score >= curation.similarity.threshold / 2))
      .sort((a, b) => b.together - a.together || b.score - a.score || a.b.localeCompare(b.b))
      .slice(0, 6)
      .map(pair => ({
        slug: pair.a === slug ? pair.b : pair.a,
        detail: pair.together ? `advertised together by ${pair.together} napplet${pair.together === 1 ? '' : 's'}` : pair.signals.map(signal => signal.detail).join('; '),
      }));
    const times = [...since, ...fallbackTimes];
    return {
      slug, napplets,
      publishers: new Set([...napplets.map(napplet => napplet.pubkey), ...own.flatMap(intent => intent.handlers.map(handler => handler.napplet.pubkey))]).size,
      intents: own.map(intent => intent.uri),
      firstSeen: times.length ? Math.min(...times) : 0,
      lastSeen: Math.max(0, ...napplets.map(napplet => napplet.createdAt), ...own.flatMap(intent => intent.handlers.map(handler => handler.napplet.createdAt))),
      status,
      ...(note?.note ? { note: note.note } : {}),
      ...(note?.reviewed ? { reviewed: note.reviewed } : {}),
      ...(coalesced?.preferred && coalesced.preferred !== slug ? { preferred: coalesced.preferred } : {}),
      aliases: coalesced ? coalesced.members.filter(member => member !== slug) : [],
      clusters: memberOf.map(cluster => cluster.id),
      related,
    } satisfies ArchetypeEntry;
  }).sort((a, b) => b.napplets.length - a.napplets.length || b.publishers - a.publishers || b.intents.length - a.intents.length || a.slug.localeCompare(b.slug));

  return {
    generatedAt: options.generatedAt ?? Math.max(0, ...releases.map(release => release.createdAt)),
    releases: releases.length,
    napplets: refs.length,
    publishers: new Set(refs.map(family => family.ref.pubkey)).size,
    archetypes,
    intents,
    clusters,
    verbs,
    silent: refs.filter(family => !family.head.archetypes.length && !family.head.intents.length).length,
  };
}

/** @param slug Archetype. @returns Whether the site can route to it. @example isRoutable('note') */
export const isRoutable = (slug: string) => SLUG.test(slug);
