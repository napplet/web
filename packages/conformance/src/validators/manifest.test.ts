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
    kind: NAPPLET_KIND_NAMED,
    tags: [
      ['d', 'demo'],
      ['path', '/index.html', HASH],
      ['requires', 'relay'],
      ['requires', 'storage'],
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
    expect(validateManifestEvent(event({ kind: NAPPLET_KIND_ROOT, tags: [['path', '/index.html', HASH]] })).ok).toBe(true);
    expect(validateManifestEvent(event({ kind: NAPPLET_KIND_SNAPSHOT, tags: [['path', '/index.html', HASH]] })).ok).toBe(true);
  });

  it('returns display metadata from the event', () => {
    const e = event({ tags: [['path', '/index.html', HASH], ['title', 'Demo Napplet']] });
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
    const missing = validateManifestEvent(event({ tags: [['path', '/index.html', HASH]] }));
    expect(missing.errors.some((e) => e.code === 'missing-d-tag')).toBe(true);

    const unexpected = validateManifestEvent(event({ kind: NAPPLET_KIND_ROOT }));
    expect(unexpected.errors.some((e) => e.code === 'unexpected-d-tag')).toBe(true);
  });

  it('requires a hashed /index.html path tag', () => {
    const missing = validateManifestEvent(event({ tags: [['d', 'demo']] }));
    expect(missing.errors.some((e) => e.code === 'missing-index-html')).toBe(true);

    const invalid = validateManifestEvent(event({ tags: [['d', 'demo'], ['path', '/index.html', 'nope']] }));
    expect(invalid.errors.some((e) => e.code === 'invalid-index-html-hash')).toBe(true);
  });

  it('requires bare NAP domains in requires tags and flags unknown ones as advisories', () => {
    const v = validateManifestEvent(event({
      tags: [
        ['d', 'demo'],
        ['path', '/index.html', HASH],
        ['requires', 'nap:relay'],
        ['requires', 'telepathy'],
      ],
    }));
    expect(v.errors.some((e) => e.code === 'invalid-required-nap')).toBe(true);
    expect(v.errors.some((e) => e.code === 'unknown-required-nap')).toBe(false);
    expect(v.warnings.some((e) => e.code === 'unknown-required-nap')).toBe(true);
  });

  it.each(['relay.subscribe', 'perm:popups', 'relay storage', 'Relay', 'nap:relay', 'NAP-RELAY'])(
    'rejects malformed requires value %j as an error, not an advisory',
    (req) => {
      const v = validateManifestEvent(event({
        tags: [
          ['d', 'demo'],
          ['path', '/index.html', HASH],
          ['requires', req],
        ],
      }));
      expect(v.ok).toBe(false);
      expect(v.errors.map((e) => e.code)).toEqual(['invalid-required-nap']);
      expect(v.warnings).toEqual([]);
    },
  );

  it('accepts a manifest whose only unusual requires tag is an unknown domain', () => {
    const v = validateManifestEvent(event({
      tags: [
        ['d', 'demo'],
        ['path', '/index.html', HASH],
        ['requires', 'mesh'],
      ],
    }));
    expect(v.ok).toBe(true);
    expect(v.warnings).toEqual([
      { code: 'unknown-required-nap', message: 'requires tag "mesh" is not a known NAP domain' },
    ]);
  });
});
