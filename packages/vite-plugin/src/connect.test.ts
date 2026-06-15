import { describe, expect, it } from 'vitest';
import * as crypto from 'crypto';
import { foldConnectOrigins } from './connect';

describe('foldConnectOrigins — NAP-CONNECT conformance fixture', () => {
  // Fixture from NAP-CONNECT.md §Conformance Fixture — order intentionally
  // scrambled to exercise the sort step (api < xn-- < wss happens to be the
  // already-sorted form, but passing scrambled guards against someone removing
  // the sort).
  const fixtureOrigins = [
    'wss://events.example.com',
    'https://api.example.com',
    'https://xn--caf-dma.example.com',
  ];
  const EXPECTED = 'cc7c1b1903fb23ecb909d2427e1dccd7d398a5c63dd65160edb0bb8b231aa742';

  it('matches the spec digest for the normative three-origin fixture', () => {
    // Re-invoke the SAME fold logic used in the manifest builder. Any drift in
    // the plugin's fold implementation (join delimiter, sort order, encoding,
    // hash algorithm) flips this digest and fails the build's grant-determinism
    // contract with shells, so we pin it here.
    expect(foldConnectOrigins(fixtureOrigins)).toBe(EXPECTED);
  });

  it('is order-independent (sorts before folding)', () => {
    const scrambled = [...fixtureOrigins].reverse();
    expect(foldConnectOrigins(scrambled)).toBe(EXPECTED);
  });

  it('uses LF-join with no trailing newline over UTF-8 SHA-256', () => {
    const canonical = [...fixtureOrigins].sort().join('\n');
    const expected = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
    expect(foldConnectOrigins(fixtureOrigins)).toBe(expected);
    expect(canonical.endsWith('\n')).toBe(false);
  });
});
