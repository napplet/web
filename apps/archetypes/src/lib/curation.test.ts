import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseCuration } from './curation';
import { DEFAULT_SIMILARITY } from './similarity';

describe('parseCuration', () => {
  it('accepts an empty file', () => {
    expect(parseCuration('')).toEqual({ similarity: DEFAULT_SIMILARITY, archetypes: {}, clusters: [] });
  });

  it('parses the checked-in curation file', () => {
    const curation = parseCuration(readFileSync(new URL('../../curation.yaml', import.meta.url), 'utf8'));
    expect(curation.archetypes.game.status).toBe('diverse');
  });

  it('reads archetype notes, clusters and similarity overrides', () => {
    const curation = parseCuration(`
similarity:
  threshold: 0.7
  weights: { containment: 0.4 }
archetypes:
  note: { status: diverse, note: "Many shapes.", reviewed: 2026-11-25 }
clusters:
  - members: [cad-viewer, 3d-model, cad-viewer]
    outcome: coalesce
    preferred: 3d-model
    params:
      - same: [model, url]
        note: same idea
`);
    expect(curation.similarity.threshold).toBe(0.7);
    expect(curation.similarity.weights.containment).toBe(0.4);
    expect(curation.similarity.weights.samePublisher).toBe(DEFAULT_SIMILARITY.weights.samePublisher);
    expect(curation.archetypes.note).toEqual({ status: 'diverse', note: 'Many shapes.', reviewed: '2026-11-25' });
    expect(curation.clusters).toEqual([{ members: ['3d-model', 'cad-viewer'], outcome: 'coalesce', preferred: '3d-model', params: [{ same: ['model', 'url'], note: 'same idea' }] }]);
  });

  it.each([
    ['nope: 1', /unknown key curation.nope/],
    ['archetypes: { "Bad Name": {} }', /archetype name/],
    ['archetypes: { note: { status: famous } }', /observed or diverse/],
    ['clusters: [{ members: [a], outcome: distinct }]', /at least two/],
    ['clusters: [{ members: [a, a], outcome: distinct }]', /two different/],
    ['clusters: [{ members: [a, b], outcome: merge }]', /coalesce, distinct or diverse/],
    ['clusters: [{ members: [a, b], outcome: coalesce }]', /preferred name/],
    ['clusters: [{ members: [a, b], outcome: coalesce, preferred: c }]', /one of the members/],
    ['clusters: [{ members: [a, b], outcome: distinct, params: [{ same: [x] }] }]', /at least two parameter/],
    ['clusters: [{ members: [a, b], outcome: coalesce, preferred: a }, { members: [b, c], outcome: coalesce, preferred: c }]', /coalesced in both/],
    ['similarity: { weights: { bogus: 1 } }', /unknown key similarity.weights.bogus/],
    ['similarity: { threshold: -1 }', /non-negative/],
    ['- list', /must be a mapping/],
  ])('rejects %s', (source, error) => expect(() => parseCuration(source)).toThrow(error));
});
