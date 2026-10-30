import { describe, it, expect } from 'vitest';
import {
  NAPPLET_KIND_NAMED,
  NAPPLET_KIND_ROOT,
  NAPPLET_KIND_SNAPSHOT,
  manifestDisplayName,
  manifestRequires,
  parsePresentationMedia,
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

it('accepts arbitrary extension tags without normalizing payloads or removing duplicates', () => {
  const extra = [['t', 'notes'], ['custom', '保留', '', '{"nested":[1,2]}'], ['custom', 'same'], ['custom', 'same'], ['flag'], ['path', 'extension'], ['description', 'extra'], ['requires', 'opaque'], ['archetype', 'opaque']];
  const input = event({ tags: [...event().tags, ...extra] });
  const original = JSON.stringify(input);
  const verdict = validateManifestEvent(input);
  expect(verdict.ok).toBe(true);
  expect(verdict.errors).toEqual([]);
  expect(verdict.warnings).toEqual([]);
  expect(JSON.stringify(input)).toBe(original);
});

it.each([
  'https://git.example.com/owner/repo.git',
  'http://git.example.com/owner/repo.git',
  'ssh://git@git.example.com/owner/repo.git',
  'git://git.example.com/owner/repo.git',
  'git@git.example.com:owner/repo.git',
  'git.example.com:owner/repo.git',
])('accepts a defined source location %s', (location) => {
  expect(validateManifestEvent(event({ tags: [...event().tags, ['source', location]] })).ok).toBe(true);
});

it.each([
  ['source'], ['source', ''], ['source', './repo'], ['source', '/home/me/repo'],
  ['source', 'file:///tmp/repo'], ['source', 'ftp://git.example.com/repo'],
  ['source', 'file:/tmp/repo'], ['source', 'file:relative'],
  ['source', 'https://git.example.com/repo', 'https://mirror.example.com/repo'],
  ['source', 'C:\\repo'],
])('validates defined optional source metadata despite unrelated extension tags: %j', (...source) => {
  const verdict = validateManifestEvent(event({ tags: [...event().tags, source, ['custom', 'anything']] }));
  expect(verdict.errors.some((error) => error.code === 'invalid-metadata')).toBe(true);
});

// NIP-5D §Source: nostr clone URLs, revision pins and source archives.
describe('source pins', () => {
  const base = event().tags;
  it('accepts a NIP-34 nostr clone URL as a source location', () => {
    expect(validateManifestEvent(event({ tags: [...base, ['source', 'nostr://npub1example/relay.example/repo']] })).ok).toBe(true);
    expect(validateManifestEvent(event({ tags: [...base, ['source', 'nostr://']] })).ok).toBe(false);
  });

  it.each(['a'.repeat(40), 'b'.repeat(64)])('accepts one source-commit %s alongside a repository source', (commit) => {
    const v = validateManifestEvent(event({ tags: [...base, ['source', 'https://git.example.com/owner/repo.git'], ['source-commit', commit]] }));
    expect(v.ok).toBe(true);
    expect(v.warnings).toEqual([]);
  });

  it('advises that a source-commit without a repository source is ignored', () => {
    const v = validateManifestEvent(event({ tags: [...base, ['source-commit', 'a'.repeat(40)]] }));
    expect(v.ok).toBe(true);
    expect(v.warnings.map((w) => w.code)).toEqual(['unused-source-commit']);
    const malformedSource = validateManifestEvent(event({ tags: [...base, ['source', './local'], ['source-commit', 'a'.repeat(40)]] }));
    expect(malformedSource.warnings.map((w) => w.code)).toEqual(['unused-source-commit']);
  });

  it.each([
    [['source-commit', 'A'.repeat(40)]],
    [['source-commit', 'a'.repeat(39)]],
    [['source-commit', 'a'.repeat(41)]],
    [['source-commit']],
    [['source-commit', 'a'.repeat(40), 'extra']],
    [['source-commit', 'a'.repeat(40)], ['source-commit', 'b'.repeat(40)]],
  ])('rejects malformed or repeated source-commit tags %j', (...tags) => {
    const v = validateManifestEvent(event({ tags: [...base, ['source', 'https://git.example.com/owner/repo.git'], ...tags] }));
    expect(v.errors.map((e) => e.code)).toEqual(['invalid-metadata']);
  });

  const archive = ['source-archive', 'https://dl.example.com/napplet-src.tar.gz', 'c'.repeat(64), 'application/gzip'];
  it('accepts one well-formed source-archive tag', () => {
    const v = validateManifestEvent(event({ tags: [...base, archive] }));
    expect(v.ok).toBe(true);
    expect(v.warnings).toEqual([]);
  });

  it.each([
    [archive.slice(0, 3)],
    [[...archive, 'extra']],
    [['source-archive', 'http://dl.example.com/src.tar.gz', 'c'.repeat(64), 'application/gzip']],
    [['source-archive', 'https://user:pw@dl.example.com/src.tar.gz', 'c'.repeat(64), 'application/gzip']],
    [['source-archive', 'https://dl.example.com/src.tar.gz#frag', 'c'.repeat(64), 'application/gzip']],
    [['source-archive', 'dl.example.com/src.tar.gz', 'c'.repeat(64), 'application/gzip']],
    [['source-archive', 'https://dl.example.com/src.tar.gz', 'C'.repeat(64), 'application/gzip']],
    [['source-archive', 'https://dl.example.com/src.tar.gz', 'c'.repeat(64), 'gzip']],
    [archive, archive],
  ])('rejects malformed or repeated source-archive tags %j', (...tags) => {
    const v = validateManifestEvent(event({ tags: [...base, ...tags] }));
    expect(v.errors.map((e) => e.code)).toEqual(['invalid-metadata']);
  });
});

// NIP-5D §Presentation media: NIP-92 key/value fields; unusable entries are ignored.
describe('presentation media', () => {
  const X = 'd'.repeat(64);
  const Y = 'e'.repeat(64);
  const base = event().tags;
  const shot = ['screenshot', `x ${X}`, 'm image/png', 'dim 1200x750', 'size 184320', 'alt The puzzle board'];
  const clip = ['preview', `x ${Y}`, 'm video/webm', 'dim 960x600', 'duration 8.5', 'alt Building a bridge'];

  it('parses screenshots in manifest order and one preview', () => {
    const e = event({ tags: [...base, shot, clip, ['screenshot', `x ${Y}`]] });
    expect(validateManifestEvent(e).ok).toBe(true);
    expect(validateManifestEvent(e).warnings).toEqual([]);
    expect(parsePresentationMedia(e)).toEqual({
      screenshots: [
        { sha256: X, mimeType: 'image/png', dim: { width: 1200, height: 750 }, size: 184320, alt: 'The puzzle board' },
        { sha256: Y },
      ],
      preview: { sha256: Y, mimeType: 'video/webm', dim: { width: 960, height: 600 }, duration: 8.5, alt: 'Building a bridge' },
      warnings: [],
    });
  });

  it('splits fields at the first ASCII space only and ignores field order and unknown keys', () => {
    const e = event({ tags: [...base, ['screenshot', 'alt Two  spaces here', 'future value', `x ${X}`]] });
    const parsed = parsePresentationMedia(e);
    expect(parsed.screenshots).toEqual([{ sha256: X, alt: 'Two  spaces here' }]);
    expect(parsed.warnings).toEqual([]);
  });

  it.each([
    [['screenshot']],
    [['screenshot', 'm image/png']],
    [['screenshot', `x ${X}`, `x ${Y}`]],
    [['screenshot', `x ${X.toUpperCase()}`]],
    [['screenshot', 'x']],
    [['screenshot', `x  ${X}`]],
    [['screenshot', `x ${X}`, 'm image/gif']],
    [['screenshot', `x ${X}`, 'm video/webm']],
    [['preview', `x ${X}`, 'm image/png']],
  ])('ignores an entry with a missing, malformed, or repeated x or an undecodable format %j', (tag) => {
    const e = event({ tags: [...base, tag, shot] });
    const parsed = parsePresentationMedia(e);
    expect(parsed.screenshots.map((s) => s.sha256)).toEqual([X]);
    expect(parsed.preview).toBeUndefined();
    expect(parsed.warnings.map((w) => w.code)).toEqual(['invalid-presentation-media']);
    const v = validateManifestEvent(e);
    expect(v.ok).toBe(true);
    expect(v.warnings.map((w) => w.code)).toEqual(['invalid-presentation-media']);
  });

  it.each([
    ['m', 'not a type'],
    ['dim', '1200'],
    ['dim', '0x750'],
    ['dim', '1200x750x2'],
    ['size', '-1'],
    ['size', '1.5'],
    ['alt', ' '],
  ])('ignores only a malformed %s field, keeping the entry', (key, value) => {
    const e = event({ tags: [...base, ['screenshot', `x ${X}`, `${key} ${value}`, 'size 10']] });
    const parsed = parsePresentationMedia(e);
    expect(parsed.screenshots).toEqual([key === 'size' ? { sha256: X } : { sha256: X, size: 10 }]);
    expect(parsed.warnings.map((w) => w.code)).toEqual(['invalid-presentation-media']);
    expect(parsed.warnings[0].message).toContain(`Ignore ${key} field`);
  });

  it('ignores a repeated optional field and a screenshot duration', () => {
    const e = event({ tags: [...base, ['screenshot', `x ${X}`, 'dim 1x1', 'dim 2x2', 'duration 3']] });
    const parsed = parsePresentationMedia(e);
    expect(parsed.screenshots).toEqual([{ sha256: X }]);
    expect(parsed.warnings).toHaveLength(1);
  });

  it.each(['8', '8.5', '0'])('accepts preview duration %s and rejects malformed durations', (duration) => {
    expect(parsePresentationMedia(event({ tags: [...base, ['preview', `x ${X}`, `duration ${duration}`]] })).preview).toEqual({ sha256: X, duration: Number(duration) });
    const bad = parsePresentationMedia(event({ tags: [...base, ['preview', `x ${X}`, 'duration 8.5s']] }));
    expect(bad.preview).toEqual({ sha256: X });
    expect(bad.warnings).toHaveLength(1);
  });

  it('ignores the preview entirely when more than one preview tag is present', () => {
    const e = event({ tags: [...base, clip, clip, shot] });
    const parsed = parsePresentationMedia(e);
    expect(parsed.preview).toBeUndefined();
    expect(parsed.screenshots).toHaveLength(1);
    expect(parsed.warnings.map((w) => w.message)).toEqual([expect.stringContaining('Multiple preview tags')]);
    expect(validateManifestEvent(e).ok).toBe(true);
  });

  it('never fails validation because of presentation media', () => {
    const e = event({ tags: [...base, ['screenshot'], ['preview'], ['preview', 'junk']] });
    const v = validateManifestEvent(e);
    expect(v.ok).toBe(true);
    expect(v.errors).toEqual([]);
    expect(v.warnings.every((w) => w.code === 'invalid-presentation-media')).toBe(true);
  });
});
