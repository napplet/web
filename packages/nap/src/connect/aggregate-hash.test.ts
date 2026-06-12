/**
 * VER-06 test: aggregateHash content-addressing via connect:origins fold.
 *
 * The NAP-CONNECT canonical fold procedure is implemented here INLINE (not
 * imported from the vite-plugin copy). Both implementations — this one AND
 * packages/vite-plugin/src/index.ts — MUST independently agree on the spec
 * conformance fixture digest. This test pins the digest to
 * `cc7c1b1903fb23ecb909d2427e1dccd7d398a5c63dd65160edb0bb8b231aa742`
 * (locked in Phase 135-03, independently verified).
 *
 * Fold procedure per NAP-CONNECT §Canonical `connect:origins` aggregateHash Fold:
 *   1. Lowercase each origin
 *   2. ASCII-ascending sort
 *   3. LF-join ('\n'), no trailing newline
 *   4. UTF-8 encode
 *   5. SHA-256
 *   6. Lowercase hex
 *
 * VER-06 content-addressing property: changing the connect origin list
 * (add/remove/mutate any origin) while dist files are unchanged MUST flip
 * the aggregateHash, thereby invalidating any grant keyed on the prior
 * (dTag, aggregateHash) pair.
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';

// ─── Canonical fold ────────────────────────────────────────────────────────

/**
 * Byte-identical to the vite-plugin implementation at
 * packages/vite-plugin/src/index.ts. Both copies MUST agree on the spec
 * conformance fixture digest. If either drifts, this test fires and the
 * vite-plugin's module-load self-check (Phase 138-03) fires independently.
 */
function foldConnectOrigins(origins: readonly string[]): {
  digest: string;
  byteLength: number;
  joined: string;
} {
  const lowercased = origins.map((o) => o.toLowerCase());
  const sorted = [...lowercased].sort();
  const joined = sorted.join('\n');
  const bytes = Buffer.from(joined, 'utf8');
  const digest = createHash('sha256').update(bytes).digest('hex');
  return { digest, byteLength: bytes.length, joined };
}

// ─── Spec-locked conformance fixture ────────────────────────────────────────

/** NAP-CONNECT §Conformance Fixture — canonical author-declared order. */
const FIXTURE_ORIGINS = [
  'https://api.example.com',
  'https://xn--caf-dma.example.com',
  'wss://events.example.com',
] as const;

/** Spec-locked SHA-256 digest (lowercase hex). Do NOT edit without a spec PR. */
const EXPECTED_DIGEST =
  'cc7c1b1903fb23ecb909d2427e1dccd7d398a5c63dd65160edb0bb8b231aa742';

/** Spec-locked joined-bytes length: 3 origins, ASCII-sorted, LF-joined, UTF-8. */
const EXPECTED_BYTE_LENGTH = 80;

/** SHA-256 of the empty string — well-defined boundary value. */
const EMPTY_SHA256 =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('connect:origins aggregateHash fold (VER-06)', () => {
  it('matches NAP-CONNECT §Conformance Fixture SHA-256 digest', () => {
    const { digest, byteLength } = foldConnectOrigins(FIXTURE_ORIGINS);
    expect(digest).toBe(EXPECTED_DIGEST);
    expect(byteLength).toBe(EXPECTED_BYTE_LENGTH);
  });

  it('joined-bytes are ASCII-sorted with LF separators, no trailing newline', () => {
    const { joined } = foldConnectOrigins(FIXTURE_ORIGINS);
    expect(joined).toBe(
      'https://api.example.com\nhttps://xn--caf-dma.example.com\nwss://events.example.com'
    );
    expect(joined.endsWith('\n')).toBe(false);
  });

  it('content-addressing: removing one origin flips the digest', () => {
    const subset = FIXTURE_ORIGINS.slice(0, 2);
    const { digest } = foldConnectOrigins(subset);
    expect(digest).not.toBe(EXPECTED_DIGEST);
  });

  it('content-addressing: adding one origin flips the digest', () => {
    const plus = [...FIXTURE_ORIGINS, 'https://new.example.com'];
    const { digest } = foldConnectOrigins(plus);
    expect(digest).not.toBe(EXPECTED_DIGEST);
  });

  it('sort is load-bearing: input reordering before sort preserves the digest', () => {
    const reversed = [...FIXTURE_ORIGINS].reverse();
    const { digest } = foldConnectOrigins(reversed);
    expect(digest).toBe(EXPECTED_DIGEST);

    // Shuffled-in-the-middle permutation also yields the same digest.
    const shuffled = [FIXTURE_ORIGINS[2], FIXTURE_ORIGINS[0], FIXTURE_ORIGINS[1]] as const;
    const { digest: shuffledDigest } = foldConnectOrigins(shuffled);
    expect(shuffledDigest).toBe(EXPECTED_DIGEST);
  });

  it('lowercase step is load-bearing: uppercased-input normalizes to the fixture digest', () => {
    // The fold's step 1 lowercases each origin; this defends against an upstream
    // producer that skipped normalization. After the internal lowercase pass,
    // these inputs fold byte-identically to the fixture.
    const uppercased = [
      'HTTPS://API.EXAMPLE.COM',
      'HTTPS://XN--CAF-DMA.EXAMPLE.COM',
      'WSS://EVENTS.EXAMPLE.COM',
    ];
    const { digest } = foldConnectOrigins(uppercased);
    expect(digest).toBe(EXPECTED_DIGEST);
  });

  it('empty origin list produces well-defined digest (sha256 of empty string)', () => {
    const { digest, byteLength } = foldConnectOrigins([]);
    expect(byteLength).toBe(0);
    expect(digest).toBe(EMPTY_SHA256);
  });

  it('VER-06 end-to-end: same dist + changed connect list → different aggregateHash', () => {
    // Simulates the build-over-build invalidation scenario: dist files unchanged,
    // only the connect:origins declaration differs → the `connect:origins`
    // synthetic entry folded into aggregateHash MUST flip, so any prior grant
    // keyed on (dTag, aggregateHash) is now stale and the user must re-consent.
    const build1 = foldConnectOrigins(['https://api.example.com']);
    const build2 = foldConnectOrigins([
      'https://api.example.com',
      'https://news.example.com',
    ]);
    expect(build1.digest).not.toBe(build2.digest);

    // Sanity: both are valid 64-char lowercase-hex SHA-256 digests.
    expect(build1.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(build2.digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it('VER-06 origin-order invariance: author reordering same set keeps hash stable', () => {
    // Complement of the prior test — author-side reordering is NOT a grant-
    // invalidating event. The grant key is the SET of origins, not the order.
    const authorOrderA = ['https://a.com', 'https://b.com', 'https://c.com'];
    const authorOrderB = ['https://c.com', 'https://a.com', 'https://b.com'];
    const { digest: digestA } = foldConnectOrigins(authorOrderA);
    const { digest: digestB } = foldConnectOrigins(authorOrderB);
    expect(digestA).toBe(digestB);
  });
});
