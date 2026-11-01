/** Trusted Napshot screenshot labels (napplet/napshot's NIP-32 profile, not NIP-5D/NAP surface) as display-only fallbacks. */
import { verifyEvent, validateEvent, type Event } from 'nostr-tools/pure';
import type { CatalogApp, ManifestMedia } from './catalog';
import { isSafeMediaUrl } from './media';

export const LABEL_KIND = 1985;
/** NIP-32 namespace of Napshot screenshot labels. */
export const SCREENSHOT_NAMESPACE = '#screenshot';
/** Upper bounds applied before any bytes are requested. */
const MAX_BYTES = 8_000_000;
const MAX_SIDE = 8192;
const MAX_MIRRORS = 4;
const HASH = /^[0-9a-f]{64}$/;
const PUBKEY = /^[0-9a-f]{64}$/;

/** A verified, revision-bound Napshot preview ready for byte verification in the browser. */
export interface NapshotScreenshot extends ManifestMedia {
  type: 'image/png';
  dim: string;
  /** Declared byte length; the fetched blob must match it exactly. */
  size: number;
  /** Validated HTTPS Blossom mirrors, in label order. */
  servers: string[];
  /** Trusted signer that published the label. */
  signer: string;
  /** Label event id, for provenance. */
  label: string;
}

/** Strict parse of the label's `screenshot` tag: one each of `x`, `m image/png`, `dim`, `size`; no duplicates. */
function screenshotFields(tag: string[]): { sha256: string; dim: string; size: number } | null {
  const fields = new Map<string, string>();
  for (const field of tag.slice(1)) {
    const space = field.indexOf(' ');
    if (space <= 0) return null;
    const key = field.slice(0, space);
    if (fields.has(key)) return null;
    fields.set(key, field.slice(space + 1));
  }
  const sha256 = fields.get('x');
  const dim = fields.get('dim');
  const size = Number(fields.get('size'));
  if (!sha256 || !HASH.test(sha256) || fields.get('m') !== 'image/png') return null;
  const sides = /^([1-9]\d{0,4})x([1-9]\d{0,4})$/.exec(dim ?? '');
  if (!sides || Number(sides[1]) > MAX_SIDE || Number(sides[2]) > MAX_SIDE) return null;
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_BYTES || fields.get('size') !== String(size)) return null;
  return { sha256, dim: dim!, size };
}

/** Deduplicated, policy-checked `server` mirrors, preserving order and any configured base path. */
function mirrors(tags: string[][]): string[] {
  const seen = new Set<string>();
  for (const tag of tags) {
    if (tag[0] !== 'server' || !tag[1] || !isSafeMediaUrl(tag[1])) continue;
    const url = new URL(tag[1]);
    url.hash = '';
    url.search = '';
    seen.add(url.href.replace(/\/+$/, ''));
  }
  return [...seen].slice(0, MAX_MIRRORS);
}

/** The single tag with this name, or null when absent or repeated. */
function only(tags: string[][], name: string): string[] | null {
  const found = tags.filter(tag => tag[0] === name);
  return found.length === 1 ? found[0] : null;
}

/**
 * Verify one untrusted relay event as a Napshot screenshot label for an exact manifest revision.
 * @param input Untrusted relay event.
 * @param manifest The signed root (15129) or named (35129) manifest the preview must describe.
 * @param signers Explicitly trusted labeler public keys; an empty list trusts nobody.
 * @returns The preview to fetch and verify, or null when any check fails.
 * @example const preview = screenshotLabel(event, app.event, config.screenshotLabelers);
 */
export function screenshotLabel(input: unknown, manifest: Event, signers: readonly string[]): NapshotScreenshot | null {
  try {
    if (!signers.length || (manifest.kind !== 15129 && manifest.kind !== 35129)) return null;
    if (!validateEvent(input) || !verifyEvent(input as Event)) return null;
    const event = input as Event;
    if (event.kind !== LABEL_KIND || !signers.includes(event.pubkey)) return null;
    const tags = event.tags;
    // The `e` tag binds the picture to this revision; `a` and `p` must agree but never select on their own.
    const identifier = manifest.kind === 35129 ? manifest.tags.find(tag => tag[0] === 'd')?.[1] ?? '' : '';
    if (only(tags, 'e')?.[1] !== manifest.id) return null;
    if (only(tags, 'a')?.[1] !== `${manifest.kind}:${manifest.pubkey}:${identifier}`) return null;
    if (only(tags, 'p')?.[1] !== manifest.pubkey) return null;
    if (!tags.some(tag => tag[0] === 'L' && tag[1] === SCREENSHOT_NAMESPACE)) return null;
    const label = only(tags.filter(tag => tag[0] !== 'l' || tag[2] === SCREENSHOT_NAMESPACE), 'l');
    const shot = only(tags, 'screenshot');
    const fields = shot && screenshotFields(shot);
    if (!fields || label?.[1] !== fields.sha256) return null;
    const servers = mirrors(tags);
    if (!servers.length) return null;
    return { ...fields, type: 'image/png', servers, signer: event.pubkey, label: event.id };
  } catch { return null; }
}

/**
 * Pick one preview deterministically: configured signer order, then newest label, then lowest event id.
 * Timestamps only break ties between already-trusted labels.
 * @param candidates Verified previews with their label timestamps.
 * @param signers Trusted signers in preference order.
 * @returns The chosen preview, if any.
 * @example const chosen = choosePreview([{ preview, createdAt: event.created_at }], signers);
 */
export function choosePreview(candidates: { preview: NapshotScreenshot; createdAt: number }[], signers: readonly string[]): NapshotScreenshot | undefined {
  return [...candidates].sort((a, b) => signers.indexOf(a.preview.signer) - signers.indexOf(b.preview.signer)
    || b.createdAt - a.createdAt || a.preview.label.localeCompare(b.preview.label))[0]?.preview;
}

/**
 * Attach Napshot previews to entries that need one. Author screenshots always win, and snapshots (5129) never get one.
 * @param apps Verified catalog entries.
 * @param labels Untrusted kind 1985 events from the snapshot or relays.
 * @param signers Explicitly trusted labeler public keys.
 * @returns Entries with `napshot` set where a trusted label for the exact revision verifies.
 * @example const apps = withNapshot(entries, snapshot.labels, config.screenshotLabelers);
 */
export function withNapshot(apps: CatalogApp[], labels: readonly unknown[], signers: readonly string[]): CatalogApp[] {
  const trusted = signers.filter(signer => PUBKEY.test(signer));
  if (!trusted.length || !labels.length) return apps;
  const byTarget = new Map<string, Event[]>();
  for (const label of labels) {
    const tags = (label as Event | null)?.tags;
    if (!Array.isArray(tags)) continue;
    for (const tag of tags) if (Array.isArray(tag) && tag[0] === 'e' && typeof tag[1] === 'string') byTarget.set(tag[1], [...(byTarget.get(tag[1]) ?? []), label as Event]);
  }
  return apps.map(app => {
    if (app.screenshots.length || app.event.kind === 5129) return app;
    const candidates = (byTarget.get(app.event.id) ?? []).flatMap(event => {
      const preview = screenshotLabel(event, app.event, trusted);
      return preview ? [{ preview, createdAt: event.created_at }] : [];
    });
    const napshot = choosePreview(candidates, trusted);
    return napshot ? { ...app, napshot } : app;
  });
}

/**
 * Manifest event ids that may receive a Napshot preview, for building a `#e` label query.
 * @param apps Verified catalog entries.
 * @returns Ids of root and named releases without a usable author screenshot.
 * @example const filter = { kinds: [1985], authors: signers, '#L': ['#screenshot'], '#e': previewTargets(apps) };
 */
export function previewTargets(apps: CatalogApp[]): string[] {
  return apps.filter(app => !app.screenshots.length && app.event.kind !== 5129).map(app => app.event.id);
}
