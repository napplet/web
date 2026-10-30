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
    | 'invalid-presentation-media'
    | 'unused-source-commit'
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

/** One usable `screenshot` or `preview` entry (NIP-5D §Presentation media). */
export interface PresentationMedia {
  /** Lowercase-hex sha256 of the complete media bytes (`x`). */
  sha256: string;
  /** Declared MIME type (`m`), when present and well-formed. */
  mimeType?: string;
  /** Pixel dimensions (`dim`), when present and well-formed. */
  dim?: { width: number; height: number };
  /** Byte size (`size`), when present and well-formed. */
  size?: number;
  /** Video duration in seconds (`duration`); preview only. */
  duration?: number;
  /** Accessible description (`alt`). */
  alt?: string;
}

/** Presentation media a client may resolve, after the spec's ignore rules. */
export interface PresentationMediaResult {
  /** Usable screenshots in manifest order. */
  screenshots: PresentationMedia[];
  /** The single usable preview video, if any. */
  preview?: PresentationMedia;
  /** Entries and fields the spec says to ignore, as advisories. */
  warnings: ManifestError[];
}

/** Screenshot formats a client decodes (NIP-5D §Presentation media). */
const SCREENSHOT_FORMATS = ['image/png', 'image/jpeg', 'image/webp'];
const MIME_TYPE = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i;

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
 * Parse `screenshot` and `preview` tags using NIP-92 `key value` fields and apply the
 * ignore rules of NIP-5D §Presentation media. Unusable entries never suppress usable
 * ones; more than one `preview` tag ignores the preview entirely.
 *
 * @param event - The resolved Nostr manifest event.
 * @returns Usable media in manifest order plus advisories for ignored input.
 * @example
 * const { screenshots, preview } = parsePresentationMedia(event);
 */
export function parsePresentationMedia(event: NappletManifestEvent): PresentationMediaResult {
  const warnings: ManifestError[] = [];
  const screenshots: PresentationMedia[] = [];
  for (const tag of event.tags.filter((tag) => tag[0] === 'screenshot')) {
    const media = parseMediaTag(tag, warnings);
    if (media) screenshots.push(media);
  }
  const previews = event.tags.filter((tag) => tag[0] === 'preview');
  let preview: PresentationMedia | undefined;
  if (previews.length > 1) {
    warnings.push({ code: 'invalid-presentation-media', message: 'Multiple preview tags; clients ignore the preview (NIP-5D §Presentation media)' });
  } else if (previews.length === 1) {
    preview = parseMediaTag(previews[0], warnings);
  }
  return { screenshots, preview, warnings };
}

function parseMediaTag(tag: string[], warnings: ManifestError[]): PresentationMedia | undefined {
  const name = tag[0];
  const ignore = (reason: string): undefined => {
    warnings.push({ code: 'invalid-presentation-media', message: `Ignore ${name} tag: ${reason} (NIP-5D §Presentation media)` });
    return undefined;
  };
  const fields = new Map<string, string[]>();
  for (const field of tag.slice(1)) {
    const space = typeof field === 'string' ? field.indexOf(' ') : -1;
    // NIP-92: split at the first ASCII space. A field without one has no value.
    const key = space < 0 ? field : field.slice(0, space);
    const value = space < 0 ? undefined : field.slice(space + 1);
    const values = fields.get(key) ?? [];
    if (value !== undefined) values.push(value);
    else values.push('');
    fields.set(key, values);
  }
  const hashes = fields.get('x');
  if (!hashes || hashes.length !== 1 || !isSha256Hex(hashes[0])) return ignore('exactly one x field with a lowercase sha256 is required');
  const media: PresentationMedia = { sha256: hashes[0] };
  const optional = (key: string, accept: (value: string) => boolean): string | undefined => {
    const values = fields.get(key);
    if (!values) return undefined;
    if (values.length !== 1 || !accept(values[0])) {
      warnings.push({ code: 'invalid-presentation-media', message: `Ignore ${key} field on ${name} ${media.sha256}: malformed or repeated (NIP-5D §Presentation media)` });
      return undefined;
    }
    return values[0];
  };
  const mimeType = optional('m', (value) => MIME_TYPE.test(value));
  if (mimeType !== undefined) {
    const decodable = name === 'preview' ? mimeType.toLowerCase().startsWith('video/') : SCREENSHOT_FORMATS.includes(mimeType.toLowerCase());
    if (!decodable) return ignore(`${mimeType} cannot match a decodable ${name === 'preview' ? 'video' : 'PNG, JPEG or WebP'} format`);
    media.mimeType = mimeType;
  }
  const dim = optional('dim', (value) => /^[1-9][0-9]*x[1-9][0-9]*$/.test(value));
  if (dim !== undefined) {
    const [width, height] = dim.split('x').map(Number);
    media.dim = { width, height };
  }
  const size = optional('size', (value) => /^(?:0|[1-9][0-9]*)$/.test(value));
  if (size !== undefined) media.size = Number(size);
  if (name === 'preview') {
    const duration = optional('duration', (value) => /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(value));
    if (duration !== undefined) media.duration = Number(duration);
  }
  const alt = optional('alt', (value) => value.trim().length > 0);
  if (alt !== undefined) media.alt = alt;
  return media;
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
  // NIP-5D §Source defines this optional tag's shape and supported locations.
  // Other tag names remain extensible under NIP-01; this is not an allowlist.
  const sources = event.tags.filter((tag) => tag[0] === 'source');
  for (const tag of sources) {
    if (tag.length !== 2 || !isSourceLocation(tag[1])) {
      errors.push({ code: 'invalid-metadata', message: 'source must contain one HTTP(S), SSH, Git, SCP, or nostr repository location' });
    }
  }
  validateSourcePins(event, sources.length === 1 && sources[0].length === 2 && isSourceLocation(sources[0][1]), errors, warnings);
  // NIP-5D §Archetypes and Intents: advertisements use queryless identities.
  for (const tag of event.tags.filter((tag) => tag[0] === 'i')) {
    if (!tag[1]?.trim() || tag[1].includes('?')) {
      errors.push({ code: 'invalid-metadata', message: 'Intent advertisements must be non-empty queryless identities' });
    }
  }
  const icons = event.tags.filter((tag) => tag[0] === 'icon');
  if (icons.length > 1 || icons.some((tag) => tag.length !== 3 || !isSha256Hex(tag[1]) || !SCREENSHOT_FORMATS.includes(tag[2]))) {
    warnings.push({ code: 'invalid-icon', message: 'Ignore invalid icon metadata and use generic artwork (NIP-5D §Icon)' });
  }
  // NIP-5D §Presentation media: unusable entries are ignored, never fatal.
  warnings.push(...parsePresentationMedia(event).warnings);
}

// NIP-5D §Source: optional revision pin and independently downloadable archive.
function validateSourcePins(event: NappletManifestEvent, hasRepositorySource: boolean, errors: ManifestError[], warnings: ManifestError[]): void {
  const commits = event.tags.filter((tag) => tag[0] === 'source-commit');
  if (commits.length > 1 || commits.some((tag) => tag.length !== 2 || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(tag[1]))) {
    errors.push({ code: 'invalid-metadata', message: 'source-commit must appear once with a full lowercase-hex Git commit ID (40 or 64 characters)' });
  } else if (commits.length === 1 && !hasRepositorySource) {
    warnings.push({ code: 'unused-source-commit', message: 'source-commit without a Git repository source is ignored (NIP-5D §Source)' });
  }
  const archives = event.tags.filter((tag) => tag[0] === 'source-archive');
  if (archives.length > 1 || archives.some((tag) => tag.length !== 4 || !isArchiveUrl(tag[1]) || !isSha256Hex(tag[2]) || !MIME_TYPE.test(tag[3] ?? ''))) {
    errors.push({ code: 'invalid-metadata', message: 'source-archive must appear once with an HTTPS URL without credentials or fragment, a lowercase sha256, and a MIME type' });
  }
}

function isArchiveUrl(value: string | undefined): boolean {
  if (!value || value.includes('#')) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

// https://github.com/nostr-protocol/nips/pull/2303 — Source
function isSourceLocation(value: string | undefined): boolean {
  if (!value || /^[a-z]:[\\/]/i.test(value)) return false;
  try {
    const { protocol } = new URL(value);
    if (['http:', 'https:', 'ssh:', 'git:'].includes(protocol)) return true;
    // NIP-34 Nostr clone URLs identify a kind-30617 repository announcement.
    if (protocol === 'nostr:') return value.length > 'nostr://'.length && value.startsWith('nostr://');
    if (protocol === 'file:') return false;
  } catch {
    // SCP clone locations are not necessarily parseable as URLs.
  }
  return !value.includes('://') && /^(?:[^@\s/:]+@)?[^:\s/]+:[^\s]+$/.test(value);
}
