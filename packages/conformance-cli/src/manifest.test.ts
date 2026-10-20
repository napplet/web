import { createHash } from 'node:crypto';
import { finalizeEvent } from 'nostr-tools/pure';
import { describe, expect, it } from 'vitest';
import { verifyManifestArtifact } from './manifest.js';

const bytes = new TextEncoder().encode('<!doctype html>\r\n<p>音楽</p>');
const hash = createHash('sha256').update(bytes).digest('hex');
const signed = (kind = 5129, tags = [['x', hash]]) => finalizeEvent({ kind, tags, content: 'A conformance fixture.', created_at: 1 }, new Uint8Array(32).fill(1));

describe('verifyManifestArtifact', () => {
  it('accepts a signed manifest bound to the exact raw bytes', () => {
    const event = signed();
    expect(verifyManifestArtifact(event, bytes).id).toBe(event.id);
  });

  it('rejects byte changes including newline normalization', () => {
    expect(() => verifyManifestArtifact(signed(), new TextEncoder().encode(new TextDecoder().decode(bytes).replace('\r\n', '\n')))).toThrow('SHA-256 mismatch');
  });

  it('rejects a tampered event even when its artifact hash matches', () => {
    expect(() => verifyManifestArtifact({ ...signed(), content: 'tampered' }, bytes)).toThrow('signature or event id');
  });

  it('rejects malformed and unsigned events', () => {
    for (const event of [null, {}, { ...signed(), tags: [null] }, { ...signed(), sig: undefined }]) {
      expect(() => verifyManifestArtifact(event, bytes)).toThrow();
    }
  });

  it('rejects signed non-manifests and duplicate hash tags', () => {
    expect(() => verifyManifestArtifact(signed(1), bytes)).toThrow('not a NIP-5D napplet kind');
    expect(() => verifyManifestArtifact(signed(5129, [['x', hash], ['x', hash]]), bytes)).toThrow('exactly one x tag');
  });

  it('keeps unknown capability registry entries advisory', () => {
    expect(verifyManifestArtifact(signed(5129, [['x', hash], ['R', 'future-domain']]), bytes)).toBeDefined();
  });
});
