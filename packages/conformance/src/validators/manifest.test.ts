import { describe, it, expect } from 'vitest';
import {
  NAPPLET_KIND_NAMED,
  NAPPLET_KIND_ROOT,
  NAPPLET_KIND_SNAPSHOT,
  manifestDisplayName,
  manifestRequires,
  validateManifest,
  validateManifestEvent,
  type NappletManifestEvent,
} from './manifest.js';

const HASH = 'a'.repeat(64);

function event(overrides: Partial<NappletManifestEvent> = {}): NappletManifestEvent {
  return {
    id: 'event-id',
    pubkey: 'pubkey',
    content: 'A test napplet',
    kind: NAPPLET_KIND_NAMED,
    tags: [
      ['d', 'demo'],
      ['x', HASH],
      ['R', 'relay'],
      ['R', 'storage'],
    ],
    ...overrides,
  };
}

describe('validateManifestEvent — happy path', () => {
  it('accepts a named napplet manifest event', () => {
    const v = validateManifestEvent(event());
    expect(v.ok, JSON.stringify(v.errors)).toBe(true);
    expect(v.kind).toBe(NAPPLET_KIND_NAMED);
    expect(v.dTag).toBe('demo');
    expect(v.requires).toEqual(['relay', 'storage']);
  });

  it('accepts root and snapshot napplet manifests without d tags', () => {
    expect(validateManifestEvent(event({ kind: NAPPLET_KIND_ROOT, tags: [['x', HASH]] })).ok).toBe(true);
    expect(validateManifestEvent(event({ kind: NAPPLET_KIND_SNAPSHOT, tags: [['x', HASH]] })).ok).toBe(true);
  });

  it('returns display metadata from the event', () => {
    const e = event({ tags: [['x', HASH], ['title', 'Demo Napplet']] });
    expect(manifestDisplayName(e)).toBe('Demo Napplet');
    expect(manifestRequires(event())).toEqual(['relay', 'storage']);
  });
});

describe('validateManifestEvent — failures', () => {
  it('accepts HTML-only callers without deriving manifest protocol state', () => {
    const v = validateManifest('<!doctype html><title>legacy</title>');
    expect(v.ok).toBe(true);
    expect(v.errors).toEqual([]);
  });

  it('flags a missing manifest event', () => {
    const v = validateManifestEvent(null);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.code === 'missing-manifest-event')).toBe(true);
  });

  it('flags non-napplet event kinds', () => {
    const v = validateManifestEvent(event({ kind: 35128 }));
    expect(v.errors.some((e) => e.code === 'invalid-napplet-kind')).toBe(true);
  });

  it('enforces d tag rules by event kind', () => {
    const missing = validateManifestEvent(event({ tags: [['x', HASH]] }));
    expect(missing.errors.some((e) => e.code === 'missing-d-tag')).toBe(true);

    const unexpected = validateManifestEvent(event({ kind: NAPPLET_KIND_ROOT }));
    expect(unexpected.errors.some((e) => e.code === 'unexpected-d-tag')).toBe(true);
  });

  it('requires the /index.html artifact x tag', () => {
    const missing = validateManifestEvent(event({ tags: [['d', 'demo']] }));
    expect(missing.errors.some((e) => e.code === 'invalid-artifact-hash')).toBe(true);

    const invalid = validateManifestEvent(event({ tags: [['d', 'demo'], ['x', 'nope']] }));
    expect(invalid.errors.some((e) => e.code === 'invalid-artifact-hash')).toBe(true);
  });

  it('requires bare NAP domains in R tags and flags unknown ones as advisories', () => {
    const v = validateManifestEvent(event({
      tags: [
        ['d', 'demo'],
        ['x', HASH],
        ['R', 'nap:relay'],
        ['R', 'telepathy'],
      ],
    }));
    expect(v.errors.some((e) => e.code === 'invalid-required-nap')).toBe(true);
    expect(v.errors.some((e) => e.code === 'unknown-required-nap')).toBe(false);
    expect(v.warnings.some((e) => e.code === 'unknown-required-nap')).toBe(true);
  });

  it.each(['relay.subscribe', 'perm:popups', 'relay storage', 'nap:relay', 'NAP-RELAY'])(
    'rejects malformed R value %j as an error, not an advisory',
    (req) => {
      const v = validateManifestEvent(event({
        tags: [
          ['d', 'demo'],
          ['x', HASH],
          ['R', req],
        ],
      }));
      expect(v.ok).toBe(false);
      expect(v.errors.map((e) => e.code)).toEqual(['invalid-required-nap']);
      expect(v.warnings).toEqual([]);
    },
  );

  it('accepts a manifest whose only unusual R tag is an unknown domain', () => {
    const v = validateManifestEvent(event({
      tags: [
        ['d', 'demo'],
        ['x', HASH],
        ['R', 'mesh'],
      ],
    }));
    expect(v.ok).toBe(true);
    expect(v.warnings).toEqual([
      { code: 'unknown-required-nap', message: 'Domain "mesh" is not in this tool\'s registry; check its NAP and runtime availability' },
    ]);
  });
});


describe('current schema cardinality and fallback', () => {
  it.each(['R', 'O'])('does not impose a lowercase-only registry rule on %s declarations', (tag) => {
    const verdict = validateManifestEvent(event({ tags: [['d', 'demo'], ['x', HASH], [tag, 'Relay']] }));
    expect(verdict.ok).toBe(true);
    expect(verdict.warnings.map((warning) => warning.code)).toEqual(['unknown-required-nap']);
  });

  it.each(['relay.subscribe', 'perm:popups', 'relay storage', 'NAP-RELAY'])('rejects malformed optional domain %j', (domain) => {
    const verdict = validateManifestEvent(event({ tags: [['d', 'demo'], ['x', HASH], ['O', domain]] }));
    expect(verdict.errors.map((error) => error.code)).toEqual(['invalid-optional-nap']);
    expect(verdict.warnings).toEqual([]);
  });
  it('rejects duplicate x, aggregate x and uppercase hashes', () => {
    for (const hashes of [[['x', HASH], ['x', HASH]], [['x', HASH, 'aggregate']], [['x', HASH.toUpperCase()]]]) {
      expect(validateManifestEvent(event({ tags: [['d', 'demo'], ...hashes] })).ok).toBe(false);
    }
  });
  it('checks empty d tags on root and duplicate identifiers on named events', () => {
    expect(validateManifestEvent(event({ kind: NAPPLET_KIND_ROOT, tags: [['d', ''], ['x', HASH]] })).ok).toBe(false);
    expect(validateManifestEvent(event({ tags: [['d', 'a'], ['d', 'b'], ['x', HASH]] })).ok).toBe(false);
  });
  it('requires description content but treats markup-like punctuation as plain text', () => {
    expect(validateManifestEvent(event({ content: '  ' })).ok).toBe(false);
    expect(validateManifestEvent(event({ content: '<b>literal</b> **text**' })).ok).toBe(true);
  });
  it('allows optional domains absent from this tool and uses fallback for invalid icons', () => {
    const v = validateManifestEvent(event({ tags: [['d', 'demo'], ['x', HASH], ['O', 'external-domain'], ['icon', 'bad', 'image/svg+xml']] }));
    expect(v.ok).toBe(true);
    expect(v.requires).toEqual([]);
    expect(v.optional).toEqual(['external-domain']);
    expect(v.warnings.some((warning) => warning.code === 'invalid-icon')).toBe(true);
  });
  it('limits lineage to snapshots without requiring a parent lookup', () => {
    const tags = [['x', HASH], ['a', `35129:${HASH}:parent`], ['A', `35129:${HASH}:root`]];
    expect(validateManifestEvent(event({ kind: NAPPLET_KIND_SNAPSHOT, tags })).ok).toBe(true);
    expect(validateManifestEvent(event({ tags: [['d', 'demo'], ...tags] })).ok).toBe(false);
  });
});

it('preserves exact identifier bytes and checks queryless intent advertisements', () => {
  const valid = event({ tags: [['d', ' My Identifier '], ['x', HASH], ['i', 'napplet:note/open', 'id']] });
  expect(validateManifestEvent(valid).dTag).toBe(' My Identifier ');
  expect(validateManifestEvent(valid).ok).toBe(true);
  expect(validateManifestEvent(event({ tags: [['d', 'demo'], ['x', HASH], ['i', 'napplet:note/open?id=1']] })).ok).toBe(false);
});
