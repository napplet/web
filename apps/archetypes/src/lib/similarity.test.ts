import { describe, expect, it } from 'vitest';
import { candidatePairs, DEFAULT_SIMILARITY, scorePair, tokens, words, type ArchetypeProfile } from './similarity';

const profile = (slug: string, extra: Partial<ArchetypeProfile> = {}): ArchetypeProfile => ({
  slug, napplets: new Set([`n-${slug}`]), publishers: new Set(), verbs: new Set(['open']), params: new Set(), words: new Set(), ...extra,
});

describe('helpers', () => {
  it('tokenises names and extracts distinctive words', () => {
    expect(tokens('text-editor')).toEqual(['text', 'editor']);
    expect([...words('Opens any STEP file in the browser')]).toEqual(['opens', 'step', 'file', 'browser']);
  });
});

describe('scorePair', () => {
  it('flags containment, with the evidence', () => {
    const pair = scorePair(profile('editor'), profile('text-editor'), DEFAULT_SIMILARITY);
    expect(pair.score).toBe(0.6);
    expect(pair.signals[0].detail).toBe('“editor” is part of “text-editor”');
  });

  it('treats reordered words as the same name', () => {
    expect(scorePair(profile('text-editor'), profile('editor_text'), DEFAULT_SIMILARITY).signals[0].kind).toBe('sameTokens');
  });

  it('catches near spellings but not unrelated names', () => {
    expect(scorePair(profile('composer'), profile('composers'), DEFAULT_SIMILARITY).signals.map(s => s.kind)).toEqual(['spelling']);
    expect(scorePair(profile('game'), profile('gameboy'), DEFAULT_SIMILARITY).score).toBe(0);
  });

  it('adds publisher, verb, parameter and description evidence', () => {
    const a = profile('cad-viewer', { publishers: new Set(['p']), verbs: new Set(['open', 'inspect']), params: new Set(['route', 'model']), words: new Set(['step', 'section', 'cuts', 'part', 'engraving']) });
    const b = profile('3d-model', { publishers: new Set(['p']), verbs: new Set(['open', 'inspect']), params: new Set(['route', 'url']), words: new Set(['step', 'section', 'cuts', 'part', 'measurements']) });
    const pair = scorePair(a, b, DEFAULT_SIMILARITY);
    expect(pair.signals.map(signal => signal.kind)).toEqual(['samePublisher', 'sharedVerb', 'sharedParams', 'description']);
    expect(pair.score).toBe(0.8);
    expect(pair.signals[0].detail).toBe('one publisher uses both');
  });

  it('never suggests names one napplet advertises together', () => {
    const pair = scorePair(profile('article', { napplets: new Set(['noris']) }), profile('article-reader', { napplets: new Set(['noris']) }), DEFAULT_SIMILARITY);
    expect(pair).toMatchObject({ score: 0, signals: [], together: 1 });
  });

  it('honours configured weights', () => {
    const config = { ...DEFAULT_SIMILARITY, weights: { ...DEFAULT_SIMILARITY.weights, containment: 0.1 } };
    expect(scorePair(profile('editor'), profile('text-editor'), config).score).toBe(0.1);
  });
});

describe('candidatePairs', () => {
  it('ignores sibling napplets from one suite that share only a publisher and description words', () => {
    const suite = (slug: string) => profile(slug, { publishers: new Set(['p']), words: new Set(['printable', 'project', 'parts']) });
    expect(candidatePairs([suite('printable-create'), suite('printable-edit')], DEFAULT_SIMILARITY)).toEqual([]);
    expect(candidatePairs([suite('printable-create'), suite('printable-edit')], { ...DEFAULT_SIMILARITY, requireOneOf: ['samePublisher'] })).toHaveLength(1);
  });

  it('returns pairs above the threshold, strongest first', () => {
    const pairs = candidatePairs([profile('text-editor'), profile('editor'), profile('incident', { publishers: new Set(['p']) }), profile('incident-command', { publishers: new Set(['p']) }), profile('feed')], DEFAULT_SIMILARITY);
    expect(pairs.map(pair => `${pair.a}+${pair.b}`)).toEqual(['incident+incident-command', 'editor+text-editor']);
  });
});
