/**
 * @napplet/vite-plugin — NAP-CONNECT origin normalization.
 *
 * Normalizes author-declared `connect` origins through the shared NAP-CONNECT
 * validator and emits one `['connect', <origin>]` tag per origin on the signed
 * manifest. Origins are NOT folded into the napplet `aggregateHash`: per NIP-5D
 * §Identity the aggregate is the NIP-5A hash of the `path` tags alone, so a
 * conformant runtime can recompute and verify it. Shells that want to invalidate
 * grants on a capability-list change key on the emitted `connect` tags instead.
 */

import { normalizeConnectOrigin } from '@napplet/nap/connect/types';
import type { Nip5aManifestOptions } from './types.js';

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
