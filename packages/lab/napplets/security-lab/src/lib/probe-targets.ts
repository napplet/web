// External targets the probes talk to. Kept in one place so the catalogue
// carries no inline URLs and a shell operator can see every host the lab may
// reach for through the runtime.

/** A host that can never resolve, so every "denied" probe is deterministic. */
export const UNRESOLVABLE_URL = 'https://example.invalid/napplet-lab-probe';

/** WebSocket flavour of the unresolvable host. */
export const UNRESOLVABLE_WS_URL = 'wss://example.invalid/napplet-lab';

/** A base the napplet must never be allowed to adopt via an injected base element. */
export const FOREIGN_BASE_URL = 'https://example.invalid/napplet-lab-base/';

/**
 * Candidates for the NAP-RESOURCE round trip. A `data:` URL would defeat the
 * test (the SDK short-circuits it to a direct fetch), so these are public https
 * hosts the napplet itself cannot reach under connect-src 'none'. Browser-hosted
 * shells fetch with the browser, so each one sends `Access-Control-Allow-Origin: *`.
 */
export const RESOURCE_PROBE_URLS: readonly string[] = [
  'https://blossom.primal.net/',
  'https://cdn.hzrd149.com/',
  'https://api.github.com/zen',
];
