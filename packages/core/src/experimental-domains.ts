/**
 * Experimental (non-NAP) domain names for prototyping.
 *
 * NIP-5D lets a NAP named `foo` own every `foo.*` message type, and manifest
 * `R` / `O` tags name "one bare NAP domain". Nothing restricts domains to the
 * NAPs this toolchain bundles, so runtimes and tools can opt in to explicitly
 * listed experimental domains while a capability is drafted. These helpers
 * define no domain themselves: every experimental name is supplied by the
 * caller, and it stays non-standard until it is proposed on the NAPs track
 * (https://github.com/napplet/naps).
 *
 * @module
 */

import { NAP_DOMAINS } from './envelope.js';

const REGISTRY_DOMAINS = new Set<string>(NAP_DOMAINS);

/** Names that would shadow `Object.prototype` members when used as `window.napplet` keys. */
const RESERVED_PROPERTY_NAMES = new Set(Object.getOwnPropertyNames(Object.prototype));

/**
 * Report whether `name` is a bare domain as NIP-5D uses the term: non-empty,
 * no whitespace (capability lists are whitespace-separated), no `.` (it
 * separates `domain.action`), no `:`, and not a `NAP-` document name.
 *
 * @param name Candidate domain name.
 * @returns True when the name is a bare domain.
 * @example
 * ```ts
 * isBareDomainName('relay');     // true
 * isBareDomainName('NAP-RELAY'); // false
 * isBareDomainName('foo.bar');   // false
 * ```
 */
export function isBareDomainName(name: string): boolean {
  return name.length > 0 && !/[.:\s]/.test(name) && !name.startsWith('NAP-');
}

/**
 * Report whether `name` is a NAP domain bundled with this toolchain.
 *
 * @param name Domain name.
 * @returns True for registry domains such as `relay`.
 * @example
 * ```ts
 * isRegistryDomain('relay'); // true
 * isRegistryDomain('mesh');  // false
 * ```
 */
export function isRegistryDomain(name: string): boolean {
  return REGISTRY_DOMAINS.has(name);
}

/**
 * Validate and normalize a caller-supplied experimental domain allowlist.
 *
 * Names are trimmed and deduplicated. Throws for a name that is not a bare
 * domain, that collides with a bundled NAP domain (an experimental domain can
 * never replace a NAP), or that would shadow an `Object.prototype` member.
 *
 * @param names Experimental domain names, e.g. from a config file or CLI flags.
 * @returns The normalized names in first-seen order.
 * @throws TypeError when a name is invalid.
 * @example
 * ```ts
 * normalizeExperimentalDomains([' mesh ', 'mesh']); // ['mesh']
 * normalizeExperimentalDomains(['relay']);          // throws: relay is a NAP domain
 * ```
 */
export function normalizeExperimentalDomains(names: readonly string[] | undefined): string[] {
  const result: string[] = [];
  for (const raw of names ?? []) {
    if (typeof raw !== 'string') throw new TypeError('Experimental domain names must be strings');
    const name = raw.trim();
    if (!isBareDomainName(name)) {
      throw new TypeError(`Experimental domain "${raw}" is not a bare domain name`);
    }
    if (REGISTRY_DOMAINS.has(name)) {
      throw new TypeError(`"${name}" is a NAP domain and cannot be registered as experimental`);
    }
    if (RESERVED_PROPERTY_NAMES.has(name)) {
      throw new TypeError(`"${name}" cannot be used as a domain name`);
    }
    if (!result.includes(name)) result.push(name);
  }
  return result;
}
