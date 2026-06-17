// @napplet/nap/shell -- NAP-SHELL shim helpers (pure; no install-time work).
//
// The actual mount + postMessage listener wiring lives in @napplet/shim's
// index.ts. This module provides the pure pieces it composes:
//   - createShellEnvironment(init): coerce an inbound shell.init payload into a
//     validated ShellEnvironment ({ capabilities: { domains, protocols }, services }).
//   - makeSupports(env): build the synchronous supports(domain, protocol?) closure.
//   - defaultSupports: the pre-init closure — always returns false.

import type { ShellCapabilities, ShellEnvironment, ShellInitMessage } from '@napplet/core';

/** Coerce an unknown value into a `string[]`, dropping non-strings. */
function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

/** Coerce an unknown value into the `protocols` map (`Record<string, string[]>`). */
function toProtocolsMap(value: unknown): Record<string, string[]> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const out: Record<string, string[]> = {};
  for (const [domain, protocols] of Object.entries(value as Record<string, unknown>)) {
    out[domain] = toStringArray(protocols);
  }
  return out;
}

/** Coerce an unknown value into the `capabilities` shape. */
function toCapabilities(value: unknown): ShellCapabilities {
  if (typeof value !== 'object' || value === null) {
    return { domains: [], protocols: {} };
  }
  const record = value as Record<string, unknown>;
  return {
    domains: toStringArray(record['domains']),
    protocols: toProtocolsMap(record['protocols']),
  };
}

/**
 * Parse an inbound `shell.init` payload into a validated {@link ShellEnvironment}.
 * Missing or malformed fields are coerced to safe empties: `domains`→`[]`,
 * `protocols`→`{}`, `services`→`[]`.
 *
 * @param init  The raw `shell.init` envelope received from the runtime.
 * @returns A normalized environment safe to cache and query.
 *
 * @example
 * ```ts
 * const env = createShellEnvironment({
 *   type: 'shell.init',
 *   capabilities: { domains: ['relay'], protocols: { inc: ['NAP-2'] } },
 *   services: ['signer'],
 * });
 * ```
 */
export function createShellEnvironment(init: Partial<ShellInitMessage> | Record<string, unknown>): ShellEnvironment {
  const record = init as Record<string, unknown>;
  return {
    capabilities: toCapabilities(record['capabilities']),
    services: toStringArray(record['services']),
  };
}

/**
 * Build the synchronous `supports(domain, protocol?)` closure for a cached
 * environment. With no `protocol`, returns whether the environment lists the
 * domain. With a `protocol`, returns whether that domain lists the protocol.
 * Unknown domains/protocols return `false`.
 *
 * @param env  The cached shell environment.
 * @returns A `(domain, protocol?) => boolean` query function.
 *
 * @example
 * ```ts
 * const supports = makeSupports(env);
 * supports('relay');            // true if 'relay' ∈ domains
 * supports('inc', 'NAP-2');     // true if protocols['inc'] includes 'NAP-2'
 * supports('unknown');          // false
 * ```
 */
export function makeSupports(env: ShellEnvironment): (domain: string, protocol?: string) => boolean {
  const domains = new Set(env.capabilities.domains);
  return (domain: string, protocol?: string): boolean => {
    if (typeof domain !== 'string') return false;
    if (protocol !== undefined) {
      const protocols = env.capabilities.protocols[domain];
      return Array.isArray(protocols) && protocols.includes(protocol);
    }
    return domains.has(domain);
  };
}

/**
 * The pre-init `supports()` closure: before `shell.init` has been delivered,
 * the environment is unknown so every query is `false`.
 */
export function defaultSupports(_domain: string, _protocol?: string): boolean {
  return false;
}
