/**
 * NIP-5D napplet manifest event validator.
 *
 * NIP-5D publishes napplets as Nostr events of kind 5129, 15129, or 35129 with
 * the artifact-hash schema in NIP-5D §Manifest. Optional HTML publishing metadata
 * does not override the signed event and is not validated here.
 *
 * @packageDocumentation
 */

import { NAP_DOMAINS } from '@napplet/core';

/** Snapshot napplet manifest event kind. */
export const NAPPLET_KIND_SNAPSHOT = 5129;
/** Root napplet manifest event kind. */
export const NAPPLET_KIND_ROOT = 15129;
/** Named napplet manifest event kind. */
export const NAPPLET_KIND_NAMED = 35129;

/** All NIP-5D napplet manifest event kinds. */
export const NAPPLET_MANIFEST_KINDS = [
  NAPPLET_KIND_SNAPSHOT,
  NAPPLET_KIND_ROOT,
  NAPPLET_KIND_NAMED,
] as const;

/** Minimal Nostr event shape needed for NIP-5D manifest validation. */
export interface NappletManifestEvent {
  kind: number;
  content?: string;
  tags: string[][];
  id?: string;
  pubkey?: string;
}

/** A single manifest problem. */
export interface ManifestError {
  /** Machine-readable code. */
  code:
    | 'missing-manifest-event'
    | 'invalid-napplet-kind'
    | 'missing-d-tag'
    | 'unexpected-d-tag'
    | 'invalid-artifact-hash'
    | 'missing-description'
    | 'invalid-metadata'
    | 'invalid-icon'
    | 'invalid-required-nap'
    | 'unknown-required-nap'
    | 'invalid-optional-nap';
  /** Human-readable explanation. */
  message: string;
}

/** Verdict returned by manifest validators. */
export interface ManifestVerdict {
  /** True when no `errors` were found. */
  ok: boolean;
  /** Napplet manifest event kind, when an event was provided. */
  kind?: number;
  /** Parsed `d` tag for named napplet manifests. */
  dTag?: string;
  /** Parsed `R` tags (bare NAP domains), empty when absent. */
  requires: string[];
  /** Optional domains declared through O tags. */
  optional: string[];
  /** Hard failures. */
  errors: ManifestError[];
  /** Non-fatal advisories. */
  warnings: ManifestError[];
}

/** Options for {@link validateManifest}. Reserved for compatibility. */
export interface ValidateManifestOptions {}

function firstTag(event: NappletManifestEvent, name: string): string[] | undefined {
  return event.tags.find((tag) => tag[0] === name);
}

function isNappletKind(kind: number): boolean {
  return (NAPPLET_MANIFEST_KINDS as readonly number[]).includes(kind);
}

function isSha256Hex(value: string | undefined): boolean {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

/** Return the named-manifest `d` tag value, when present and non-empty. */
export function manifestDTag(event: NappletManifestEvent): string | undefined {
  const d = firstTag(event, 'd')?.[1];
  return d || undefined;
}

/** Return all bare NAP domains declared by `R` tags. */
export function manifestRequires(event: NappletManifestEvent): string[] {
  return event.tags
    .filter((tag) => tag[0] === 'R')
    .map((tag) => tag[1]?.trim() ?? '')
    .filter(Boolean);
}

/** Return a compact display label for a resolved manifest event. */
export function manifestDisplayName(event: NappletManifestEvent): string | undefined {
  return manifestDTag(event) ?? firstTag(event, 'title')?.[1] ?? event.id;
}

/**
 * Validate a NIP-5D napplet manifest event.
 *
 * @param event - The resolved Nostr manifest event.
 * @returns A {@link ManifestVerdict}.
 */
export function validateManifestEvent(event?: NappletManifestEvent | null): ManifestVerdict {
  const errors: ManifestError[] = [];
  const warnings: ManifestError[] = [];

  if (!event) {
    return {
      ok: false,
      requires: [],
      optional: [],
      errors: [{ code: 'missing-manifest-event', message: 'No NIP-5D manifest event was resolved' }],
      warnings,
    };
  }

  const dTag = manifestDTag(event);
  const requires = manifestRequires(event);

  if (!isNappletKind(event.kind)) {
    errors.push({
      code: 'invalid-napplet-kind',
      message: `Manifest event kind ${event.kind} is not a NIP-5D napplet kind`,
    });
  }

  const identifiers = event.tags.filter((tag) => tag[0] === 'd');
  if (event.kind === NAPPLET_KIND_NAMED && (identifiers.length !== 1 || !dTag)) {
    errors.push({ code: 'missing-d-tag', message: 'Named manifests require exactly one non-empty d tag' });
  } else if (event.kind !== NAPPLET_KIND_NAMED && identifiers.length > 0) {
    errors.push({ code: 'unexpected-d-tag', message: 'Only named manifests carry a d tag' });
  }

  const hashes = event.tags.filter((tag) => tag[0] === 'x');
  if (hashes.length !== 1 || hashes[0].length !== 2 || !isSha256Hex(hashes[0][1])) {
    errors.push({ code: 'invalid-artifact-hash', message: 'Manifest requires exactly one x tag with the lowercase sha256 of /index.html' });
  }
  if (typeof event.content !== 'string' || !event.content.trim()) {
    errors.push({ code: 'missing-description', message: 'Manifest content must contain a non-empty plain-text description' });
  }

  validateCapabilities(event, errors, warnings);
  validateMetadata(event, errors, warnings);

  return {
    ok: errors.length === 0,
    kind: event.kind,
    dTag,
    requires,
    optional: event.tags.filter((tag) => tag[0] === 'O').map((tag) => tag[1]).filter(Boolean),
    errors,
    warnings,
  };
}

/**
 * Compatibility wrapper for older callers that passed HTML.
 *
 * NIP-5D manifest validation requires the signed Nostr manifest event. HTML-only
 * callers cannot prove event kind, artifact `x` tags, `R` tags, or artifact
 * identity, so this wrapper intentionally performs no protocol checks.
 *
 * @param _html - Legacy HTML input.
 * @param _options - Reserved compatibility parameter.
 * @returns A passing empty verdict.
 */
export function validateManifest(_html: string, _options: ValidateManifestOptions = {}): ManifestVerdict {
  return { ok: true, requires: [], optional: [], errors: [], warnings: [] };
}

// NIP-5D §Required and Optional Capabilities: registry knowledge is not a grant
// or a complete list of independently specified NAP domains.
function validateCapabilities(event: NappletManifestEvent, errors: ManifestError[], warnings: ManifestError[]): void {
  for (const tag of event.tags.filter((tag) => tag[0] === 'R' || tag[0] === 'O')) {
    const domain = tag[1];
    if (tag.length !== 2 || !domain || /[.:\s]/.test(domain) || domain.startsWith('NAP-')) {
      errors.push({ code: tag[0] === 'R' ? 'invalid-required-nap' : 'invalid-optional-nap', message: `${tag[0]} must name one bare NAP domain` });
    } else if (!(NAP_DOMAINS as readonly string[]).includes(domain)) {
      warnings.push({ code: 'unknown-required-nap', message: `Domain "${domain}" is not in this tool's registry; check its NAP and runtime availability` });
    }
  }
}

function validateMetadata(event: NappletManifestEvent, errors: ManifestError[], warnings: ManifestError[]): void {
  for (const name of ['title', 'source', 'a', 'A']) {
    const tags = event.tags.filter((tag) => tag[0] === name);
    if (tags.length > 1 || (tags.length && (name === 'a' || name === 'A') && event.kind !== NAPPLET_KIND_SNAPSHOT)) {
      errors.push({ code: 'invalid-metadata', message: `Invalid ${name} tag cardinality for kind ${event.kind}` });
    }
  }
  // NIP-5D §Archetypes and Intents: advertisements use queryless identities.
  for (const tag of event.tags.filter((tag) => tag[0] === 'i')) {
    if (!tag[1]?.trim() || tag[1].includes('?')) {
      errors.push({ code: 'invalid-metadata', message: 'Intent advertisements must be non-empty queryless identities' });
    }
  }
  const icons = event.tags.filter((tag) => tag[0] === 'icon');
  if (icons.length > 1 || icons.some((tag) => tag.length !== 3 || !isSha256Hex(tag[1]) || !['image/png', 'image/jpeg', 'image/webp'].includes(tag[2]))) {
    warnings.push({ code: 'invalid-icon', message: 'Ignore invalid icon metadata and use generic artwork (NIP-5D §Icon)' });
  }
}
