// ─── Synonym candidate heuristics ───────────────────────────────────────────
// Suggests archetypes that may name the same thing. A suggestion is never a
// merge: only a curator's entry in curation.yaml changes how archetypes group.

export interface SimilarityConfig {
  /** Pairs scoring at or above this become candidates. */
  threshold: number;
  weights: {
    /** Same tokens in a different order or with different separators (`text-editor`, `editor-text`). */
    sameTokens: number;
    /** One name's tokens appear inside the other's (`editor` in `text-editor`). */
    containment: number;
    /** Near-identical spelling (edit distance), for typos and plurals. */
    spelling: number;
    /** At least one publisher uses both names. */
    samePublisher: number;
    /** A verb other than the most common one is shared. */
    sharedVerb: number;
    /** Parameter names overlap. */
    sharedParams: number;
    /** Descriptions share distinctive words. */
    description: number;
  };
  /** Minimum share of distinctive description words two archetypes must have in common. */
  descriptionOverlap: number;
  /** Minimum spelling similarity (0–1) for the spelling signal. */
  spellingRatio: number;
}

export const DEFAULT_SIMILARITY: SimilarityConfig = {
  threshold: 0.5,
  weights: { sameTokens: 0.9, containment: 0.6, spelling: 0.6, samePublisher: 0.2, sharedVerb: 0.1, sharedParams: 0.2, description: 0.3 },
  descriptionOverlap: 0.2,
  spellingRatio: 0.85,
};

/** What the heuristics know about one archetype. */
export interface ArchetypeProfile {
  slug: string;
  /** Napplet keys advertising the archetype. */
  napplets: Set<string>;
  publishers: Set<string>;
  verbs: Set<string>;
  params: Set<string>;
  /** Distinctive lower-case words from implementers' descriptions. */
  words: Set<string>;
}

export interface Signal { kind: keyof SimilarityConfig['weights']; detail: string }

export interface PairScore {
  a: string;
  b: string;
  score: number;
  signals: Signal[];
  /** Napplets that advertise both names. A napplet listing both treats them as different facets, so the pair is never a synonym candidate. */
  together: number;
}

const STOP = new Set('a an and any app are as at be by can for from in into is it its napplet napplets no not of on one or over shell the their them this to up use uses using via with without you your all will that than then there these those who what when which while also just more most only other our out own same so some such very'.split(' '));

/**
 * Lower-case words of three or more letters, minus stop words.
 * @param text Plain text.
 * @returns Distinct words.
 * @example words('Opens any STEP file') // Set { 'opens', 'step', 'file' }
 */
export function words(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter(word => !STOP.has(word)));
}

/** @param slug Archetype. @returns Its separator-split tokens. @example tokens('text-editor') // ['text', 'editor'] */
export function tokens(slug: string): string[] {
  return slug.split(/[-_.]+/).filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

const overlap = (a: Set<string>, b: Set<string>) => [...a].filter(value => b.has(value));
const jaccard = (a: Set<string>, b: Set<string>) => {
  const shared = overlap(a, b).length;
  const union = new Set([...a, ...b]).size;
  return union ? shared / union : 0;
};

/**
 * Score how likely two archetypes name the same thing, with the evidence.
 * @param a First archetype.
 * @param b Second archetype.
 * @param config Weights and thresholds.
 * @param commonVerb The most widely used verb, which says little on its own.
 * @returns Score (unbounded sum of weights) and the signals that fired; zero when one napplet advertises both.
 * @example scorePair(profileA, profileB, DEFAULT_SIMILARITY, 'open')
 */
export function scorePair(a: ArchetypeProfile, b: ArchetypeProfile, config: SimilarityConfig, commonVerb = 'open'): PairScore {
  const together = overlap(a.napplets, b.napplets).length;
  if (together) return { a: a.slug, b: b.slug, score: 0, signals: [], together };
  const signals: Signal[] = [];
  let score = 0;
  const fire = (kind: Signal['kind'], detail: string) => { signals.push({ kind, detail }); score += config.weights[kind]; };
  const ta = tokens(a.slug);
  const tb = tokens(b.slug);
  const sa = [...ta].sort().join(' ');
  const sb = [...tb].sort().join(' ');
  if (sa === sb) fire('sameTokens', `same words: ${ta.join(', ')}`);
  else if (ta.every(token => tb.includes(token)) || tb.every(token => ta.includes(token))) {
    const [short, long] = ta.length <= tb.length ? [a.slug, b.slug] : [b.slug, a.slug];
    fire('containment', `“${short}” is part of “${long}”`);
  } else {
    const flatA = ta.join('');
    const flatB = tb.join('');
    const ratio = 1 - levenshtein(flatA, flatB) / Math.max(flatA.length, flatB.length);
    if (ratio >= config.spellingRatio) fire('spelling', `spelled alike (${Math.round(ratio * 100)}%)`);
  }
  const publishers = overlap(a.publishers, b.publishers);
  if (publishers.length) fire('samePublisher', publishers.length === 1 ? 'one publisher uses both' : `${publishers.length} publishers use both`);
  const verbs = overlap(a.verbs, b.verbs).filter(verb => verb !== commonVerb);
  if (verbs.length) fire('sharedVerb', `shared verb${verbs.length === 1 ? '' : 's'}: ${verbs.join(', ')}`);
  const params = overlap(a.params, b.params);
  if (params.length) fire('sharedParams', `shared parameter${params.length === 1 ? '' : 's'}: ${params.join(', ')}`);
  if (a.words.size && b.words.size && jaccard(a.words, b.words) >= config.descriptionOverlap) {
    fire('description', `descriptions share: ${overlap(a.words, b.words).slice(0, 5).join(', ')}`);
  }
  return { a: a.slug, b: b.slug, score: Math.round(score * 100) / 100, signals, together: 0 };
}

/**
 * Every pair at or above the threshold, strongest first.
 * @param profiles Archetype profiles.
 * @param config Weights and thresholds.
 * @param commonVerb The most widely used verb.
 * @returns Candidate pairs (`a` sorts before `b`).
 * @example candidatePairs(profiles, DEFAULT_SIMILARITY, 'open')
 */
export function candidatePairs(profiles: ArchetypeProfile[], config: SimilarityConfig, commonVerb = 'open'): PairScore[] {
  const sorted = [...profiles].sort((x, y) => x.slug.localeCompare(y.slug));
  const out: PairScore[] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const pair = scorePair(sorted[i], sorted[j], config, commonVerb);
      if (pair.score >= config.threshold) out.push(pair);
    }
  }
  return out.sort((x, y) => y.score - x.score || x.a.localeCompare(y.a) || x.b.localeCompare(y.b));
}
