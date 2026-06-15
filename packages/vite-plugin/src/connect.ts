/**
 * @napplet/vite-plugin — NAP-CONNECT origin normalization and aggregateHash fold.
 *
 * Normalizes author-declared `connect` origins through the shared NAP-CONNECT
 * validator and computes the canonical `connect:origins` aggregateHash fold
 * (lowercase → ASCII-ascending sort → LF-join no trailing → UTF-8 → SHA-256 →
 * lowercase hex). The fold is exported as {@link foldConnectOrigins} so its
 * determinism can be asserted against the NAP-CONNECT.md §Conformance Fixture
 * in tests without shipping example.com URLs in production source.
 */

import * as crypto from 'crypto';
import { normalizeConnectOrigin } from '@napplet/nap/connect/types';
import type { Nip5aManifestOptions } from './types.js';

/**
 * Canonical NAP-CONNECT `connect:origins` aggregateHash fold.
 *
 * Applies the spec fold to a list of already-normalized origins: ASCII-ascending
 * sort → LF-join (no trailing newline) → UTF-8 → SHA-256 → lowercase hex. Any
 * change to delimiter, sort order, encoding, or hash algorithm flips the digest,
 * which auto-invalidates shell grants keyed on `(dTag, aggregateHash)`.
 *
 * @param origins - normalized NAP-CONNECT origins (output of {@link normalizeConnectOptions}).
 * @returns Lowercase hex SHA-256 digest of the canonical fold.
 * @see NAP-CONNECT.md §Canonical `connect:origins` aggregateHash Fold
 * @example
 * foldConnectOrigins(['https://api.example.com', 'wss://events.example.com']);
 */
export function foldConnectOrigins(origins: string[]): string {
  const sorted = [...origins].sort();
  const canonical = sorted.join('\n');
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Normalize author-declared `connect` origins for build-time emission.
 *
 * Validates each origin through the shared NAP-CONNECT validator (throwing a
 * `[nip5a-manifest]`-prefixed error on the first violation) and emits a
 * non-blocking `console.warn` when cleartext (`http:`/`ws:`) origins are present.
 *
 * @param options - Nip5aManifestOptions (reads `connect` only).
 * @returns Normalized origins in author-declared order; `[]` when none declared.
 * @throws Error with `[nip5a-manifest]` prefix when `connect` is not an array
 *         or any origin fails NAP-CONNECT normalization.
 */
export function normalizeConnectOptions(options: Pick<Nip5aManifestOptions, 'connect'>): string[] {
  if (options.connect === undefined) return [];
  if (!Array.isArray(options.connect)) {
    throw new Error('[nip5a-manifest] connect option must be an array of origin strings');
  }

  const normalized = options.connect.map((origin) => {
    try {
      return normalizeConnectOrigin(origin);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`[nip5a-manifest] invalid connect origin: ${msg}`);
    }
  });

  const cleartext = normalized.filter((o) => o.startsWith('http://') || o.startsWith('ws://'));
  if (cleartext.length > 0) {
    console.warn(
      `[@napplet/vite-plugin] connect includes cleartext origin(s): ${cleartext.join(', ')} — browser mixed-content rules will silently block http:/ws: fetches from HTTPS shells unless the origin is http://localhost or http://127.0.0.1. Some shells refuse cleartext entirely (check \`shell.supports('connect:scheme:http')\`). See NAP-CONNECT for details.`,
    );
  }

  return normalized;
}
