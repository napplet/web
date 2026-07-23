/**
 * NIP-5D napplet manifest event validator.
 *
 * NIP-5D publishes napplets as Nostr events of kind 5129, 15129, or 35129 with
 * the NIP-5A `path` tag schema. HTML `<meta name="napplet-*">` tags are not
 * protocol surface and are intentionally not validated here.
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
    | 'missing-index-html'
    | 'invalid-index-html-hash'
    | 'invalid-required-nap'
    | 'unknown-required-nap';
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
  /** Parsed `requires` tags (bare NAP domains), empty when absent. */
  requires: string[];
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
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value);
}

/** Return the named-manifest `d` tag value, when present and non-empty. */
export function manifestDTag(event: NappletManifestEvent): string | undefined {
  const d = firstTag(event, 'd')?.[1]?.trim();
  return d || undefined;
}

/** Return all bare NAP domains declared by `requires` tags. */
export function manifestRequires(event: NappletManifestEvent): string[] {
  return event.tags
    .filter((tag) => tag[0] === 'requires')
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

  if (event.kind === NAPPLET_KIND_NAMED && !dTag) {
    errors.push({
      code: 'missing-d-tag',
      message: 'Named napplet manifest kind 35129 must include a non-empty d tag',
    });
  } else if ((event.kind === NAPPLET_KIND_ROOT || event.kind === NAPPLET_KIND_SNAPSHOT) && dTag) {
    errors.push({
      code: 'unexpected-d-tag',
      message: `Napplet manifest kind ${event.kind} must not include a d tag`,
    });
  }

  const indexPath = event.tags.find((tag) => tag[0] === 'path' && tag[1] === '/index.html');
  if (!indexPath) {
    errors.push({
      code: 'missing-index-html',
      message: 'Napplet manifest must include a path tag for /index.html',
    });
  } else if (!isSha256Hex(indexPath[2])) {
    errors.push({
      code: 'invalid-index-html-hash',
      message: 'The /index.html path tag must carry a 64-character sha256 hash',
    });
  }

  for (const req of requires) {
    if (req.startsWith('nap:') || req.startsWith('NAP-')) {
      errors.push({
        code: 'invalid-required-nap',
        message: `requires tag "${req}" must be a bare NAP domain such as "relay"`,
      });
      continue;
    }
    if (!(NAP_DOMAINS as readonly string[]).includes(req)) {
      errors.push({
        code: 'unknown-required-nap',
        message: `requires tag "${req}" is not a known NAP domain`,
      });
    }
  }

  return {
    ok: errors.length === 0,
    kind: event.kind,
    dTag,
    requires,
    errors,
    warnings,
  };
}

/**
 * Compatibility wrapper for older callers that passed HTML.
 *
 * NIP-5D manifest validation requires the signed Nostr manifest event. HTML-only
 * callers cannot prove event kind, `path` tags, `requires` tags, or aggregate
 * identity, so this wrapper intentionally performs no protocol checks.
 *
 * @param _html - Legacy HTML input.
 * @param _options - Reserved compatibility parameter.
 * @returns A passing empty verdict.
 */
export function validateManifest(_html: string, _options: ValidateManifestOptions = {}): ManifestVerdict {
  return { ok: true, requires: [], errors: [], warnings: [] };
}
