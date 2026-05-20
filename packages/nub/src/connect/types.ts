/**
 * @napplet/nub/connect -- Connect NUB types + shared origin normalizer.
 *
 * NUB-CONNECT has NO postMessage wire protocol. Grants flow through the
 * runtime CSP emitted by the shell in the HTTP response for the napplet
 * HTML, plus a shell-injected `<meta name="napplet-connect-granted">` tag
 * read synchronously at shim install time.
 *
 * This file exports:
 * - `DOMAIN` constant — the NUB domain identifier
 * - `NappletConnect` interface — readonly runtime state shape mounted at
 *   `window.napplet.connect`. Must remain structurally assignment-compatible
 *   with `NappletGlobal['connect']` in @napplet/core.
 * - `normalizeConnectOrigin()` pure function — shared origin validator used
 *   by the vite-plugin (build-side) AND shell implementations (runtime-side).
 *   Single source of truth per NUB-CONNECT spec.
 */

// ─── Domain Constants ──────────────────────────────────────────────────────

/** The NUB domain name for connect messages (no wire protocol — informational). */
export const DOMAIN = 'connect' as const;

// ─── Runtime State Shape ───────────────────────────────────────────────────

/**
 * Readonly runtime state mounted at `window.napplet.connect`.
 *
 * Structurally identical to `NappletGlobal['connect']` in @napplet/core —
 * the two-field shape (`readonly granted: boolean`, `readonly origins: readonly string[]`)
 * is the locked cross-package contract.
 *
 * `granted` is false when the shell did not inject the `napplet-connect-granted`
 * meta tag OR injected it with empty content (denied / ungranted). Never undefined.
 * `origins` is the list of origins the shell granted `connect-src` access to.
 * Empty when `granted` is false. Origins are already normalized per
 * `normalizeConnectOrigin`.
 */
export interface NappletConnect {
  readonly granted: boolean;
  readonly origins: readonly string[];
}

// ─── Origin Normalizer (shared build-side + shell-side) ────────────────────

const ERR_PREFIX = '[@napplet/nub/connect]';
const ACCEPTED_SCHEMES = new Set(['https', 'wss', 'http', 'ws']);
const DEFAULT_PORTS: Record<string, string> = {
  https: '443',
  wss: '443',
  http: '80',
  ws: '80',
};

/**
 * Validate a connect origin against the NUB-CONNECT origin format rules and
 * return the byte-identical input on success. Throws on any rule violation
 * with an error message prefixed `[@napplet/nub/connect]` so downstream
 * diagnostics (vite-plugin, shell) can re-prefix with their own namespace.
 *
 * Accepts: scheme in {https,wss,http,ws}; all-lowercase host; valid IPv4
 * literal (dotted decimal, each octet 0-255); already-Punycode IDN;
 * explicit non-default port.
 *
 * Rejects: uppercase scheme/host; wildcard host (`*`); path/query/fragment;
 * default port explicit (443 on https/wss, 80 on http/ws); non-Punycode
 * non-ASCII host; IPv6 literal (bracketed or contains `:` in host).
 *
 * @param origin  The candidate origin string.
 * @returns The input string (byte-identical) on successful validation.
 * @throws Error with `[@napplet/nub/connect]`-prefixed message on violation.
 *
 * @example
 * ```ts
 * normalizeConnectOrigin('https://api.example.com');          // 'https://api.example.com'
 * normalizeConnectOrigin('wss://stream.example.com:8443');    // 'wss://stream.example.com:8443'
 * normalizeConnectOrigin('http://127.0.0.1');                 // 'http://127.0.0.1'
 * normalizeConnectOrigin('https://API.example.com');          // throws (uppercase host)
 * normalizeConnectOrigin('https://*.example.com');            // throws (wildcard)
 * normalizeConnectOrigin('https://café.example.com');         // throws (non-Punycode IDN)
 * normalizeConnectOrigin('https://[::1]');                    // throws (IPv6 v1 scope)
 * ```
 */
export function normalizeConnectOrigin(origin: string): string {
  if (typeof origin !== 'string' || origin.length === 0) {
    throw new Error(`${ERR_PREFIX} origin must be a non-empty string`);
  }

  // Early scheme split — must contain '://' exactly once in scheme boundary
  const schemeIdx = origin.indexOf('://');
  if (schemeIdx < 0) {
    throw new Error(`${ERR_PREFIX} origin missing scheme separator '://': ${origin}`);
  }
  const scheme = origin.slice(0, schemeIdx);
  const rest = origin.slice(schemeIdx + 3);

  // Scheme: must be lowercase, in accepted set
  if (scheme !== scheme.toLowerCase()) {
    throw new Error(`${ERR_PREFIX} scheme must be lowercase: ${origin}`);
  }
  if (!ACCEPTED_SCHEMES.has(scheme)) {
    throw new Error(`${ERR_PREFIX} scheme must be one of https|wss|http|ws: ${origin}`);
  }

  // Reject path / query / fragment — any '/', '?', '#' after scheme is a violation
  if (rest.includes('/')) {
    throw new Error(`${ERR_PREFIX} origin MUST NOT contain a path: ${origin}`);
  }
  if (rest.includes('?')) {
    throw new Error(`${ERR_PREFIX} origin MUST NOT contain a query: ${origin}`);
  }
  if (rest.includes('#')) {
    throw new Error(`${ERR_PREFIX} origin MUST NOT contain a fragment: ${origin}`);
  }

  // Reject wildcard
  if (rest.includes('*')) {
    throw new Error(`${ERR_PREFIX} wildcard origins are not permitted: ${origin}`);
  }

  // Host / port split. IPv6 brackets are rejected outright (v1 scope).
  if (rest.startsWith('[')) {
    throw new Error(`${ERR_PREFIX} IPv6 literal origins are out of v1 scope: ${origin}`);
  }

  // Split on last ':' to separate host from optional port.
  let host = rest;
  let port: string | null = null;
  const portColonIdx = rest.lastIndexOf(':');
  if (portColonIdx >= 0) {
    host = rest.slice(0, portColonIdx);
    port = rest.slice(portColonIdx + 1);
    if (!/^[0-9]+$/.test(port)) {
      throw new Error(`${ERR_PREFIX} port must be decimal digits: ${origin}`);
    }
    const portNum = Number(port);
    if (portNum < 1 || portNum > 65535) {
      throw new Error(`${ERR_PREFIX} port out of range 1-65535: ${origin}`);
    }
    if (DEFAULT_PORTS[scheme] === port) {
      throw new Error(`${ERR_PREFIX} default port ${port} MUST be omitted for scheme ${scheme}: ${origin}`);
    }
  }

  // After port strip, host must not contain ':' (would indicate IPv6 without brackets)
  if (host.includes(':')) {
    throw new Error(`${ERR_PREFIX} IPv6 literal origins are out of v1 scope: ${origin}`);
  }

  if (host.length === 0) {
    throw new Error(`${ERR_PREFIX} host is empty: ${origin}`);
  }

  // Host must be all-lowercase
  if (host !== host.toLowerCase()) {
    throw new Error(`${ERR_PREFIX} host MUST be lowercase: ${origin}`);
  }

  // Host must be ASCII (non-ASCII = must be Punycode'd before call)
  // eslint-disable-next-line no-control-regex
  if (!/^[\x00-\x7F]+$/.test(host)) {
    throw new Error(`${ERR_PREFIX} non-ASCII host MUST be Punycode-encoded (xn--...) before calling: ${origin}`);
  }

  // IPv4 literal acceptance: 4 dotted-decimal octets 0-255
  const isIPv4 = /^[0-9]+(\.[0-9]+){3}$/.test(host);
  if (isIPv4) {
    const octets = host.split('.');
    for (const oct of octets) {
      if (oct.length > 1 && oct.startsWith('0')) {
        throw new Error(`${ERR_PREFIX} IPv4 octet MUST NOT have leading zeros: ${origin}`);
      }
      const n = Number(oct);
      if (!Number.isInteger(n) || n < 0 || n > 255) {
        throw new Error(`${ERR_PREFIX} IPv4 octet out of range 0-255: ${origin}`);
      }
    }
    return origin;
  }

  // DNS hostname validation: RFC 1123 labels separated by '.'
  // Each label: 1-63 chars, alphanumeric + hyphen, no leading/trailing hyphen.
  // Punycode labels (xn--...) pass this check since '-' is permitted mid-label.
  const labels = host.split('.');
  for (const label of labels) {
    if (label.length === 0 || label.length > 63) {
      throw new Error(`${ERR_PREFIX} invalid host label length: ${origin}`);
    }
    if (!/^[a-z0-9-]+$/.test(label)) {
      throw new Error(`${ERR_PREFIX} host label contains invalid characters: ${origin}`);
    }
    if (label.startsWith('-') || label.endsWith('-')) {
      throw new Error(`${ERR_PREFIX} host label MUST NOT start or end with hyphen: ${origin}`);
    }
  }

  return origin;
}
