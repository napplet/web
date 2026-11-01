/** Render manifest media only from bytes whose hash and format were verified, as NIP-5D requires. */
import { normalizeBlossomServer } from 'applesauce-common/helpers';
import { isImageType, type CatalogApp, type ManifestMedia } from './catalog';

const MAX_BYTES = 8_000_000;
const TIMEOUT_MS = 15_000;
const cache = new Map<string, Promise<string | null>>();
const issued = new Set<string>();

/** Extra checks for media whose size and dimensions were declared up front (Napshot labels). */
export interface MediaExpectations {
  /** Exact byte length; also the read limit, so an unchecked declaration never sizes an allocation. */
  bytes?: number;
  /** Exact decoded `WIDTHxHEIGHT`. */
  dim?: string;
  /** Fetch `<server>/<sha256>` keeping the server's base path instead of the origin root. */
  keepPath?: boolean;
}

const PRIVATE_V4 = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];

/**
 * Whether a media URL is acceptable to fetch from the browser: HTTPS, no credentials, and not an obviously local host.
 * @param value Untrusted URL from a manifest or label.
 * @returns True when the URL passes this site's network policy.
 * @example isSafeMediaUrl('https://cdn.example/blobs') // true
 */
export function isSafeMediaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (url.protocol !== 'https:' || url.username || url.password || !host.includes('.') && !host.includes(':')) return false;
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return !PRIVATE_V4.some(range => range.test(host));
    if (host.includes(':')) return !(host === '::1' || host === '::' || /^f[cd]/.test(host) || /^fe[89ab]/.test(host) || host.startsWith('::ffff:'));
    return true;
  } catch { return false; }
}

function magic(bytes: Uint8Array, type: string): boolean {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (type === 'image/png') return bytes[0] === 0x89 && ascii(1, 4) === 'PNG';
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/webp') return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
  return false;
}

function sniff(bytes: Uint8Array): string | undefined {
  return ['image/png', 'image/jpeg', 'image/webp'].find(type => magic(bytes, type));
}

async function digest(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Read at most `limit` bytes, giving up as soon as the body or its declared length exceeds it. */
async function readBounded(response: Response, limit: number): Promise<Uint8Array | null> {
  const declared = Number(response.headers.get('content-length') ?? NaN);
  if (declared > limit) return null;
  if (!response.body) { const bytes = new Uint8Array(await response.arrayBuffer()); return bytes.byteLength <= limit ? bytes : null; }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) { void reader.cancel(); return null; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

function blobUrl(server: string, sha256: string, keepPath: boolean): URL {
  return keepPath ? new URL(`${server.replace(/\/+$/, '')}/${sha256}`) : new URL(sha256, normalizeBlossomServer(server));
}

/**
 * The author screenshot the renderer can actually fetch and decode, if any.
 * A screenshot whose declared type the renderer cannot decode, or whose every mirror fails the fetch policy, is not usable author art:
 * Napshot eligibility and card media treat it as absent so a valid preview can still fill in.
 * @param app Verified catalog entry.
 * @returns The first screenshot whose bytes the renderer would attempt, or undefined.
 * @example const shot = usableScreenshot(app);
 */
export function usableScreenshot(app: CatalogApp): ManifestMedia | undefined {
  return app.screenshots.find(media => (media.type === undefined || isImageType(media.type)) && app.servers.some(server => {
    try { return isSafeMediaUrl(blobUrl(server, media.sha256, false).href); } catch { return false; }
  }));
}

async function fetchVerified(media: ManifestMedia, servers: string[], signal: AbortSignal, expect: MediaExpectations): Promise<string | null> {
  const limit = Math.min(expect.bytes ?? MAX_BYTES, MAX_BYTES);
  for (const server of servers) {
    try {
      const url = blobUrl(server, media.sha256, expect.keepPath ?? false);
      if (!isSafeMediaUrl(url.href)) continue;
      const timed = typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]) : signal;
      // Redirects are refused before the browser can follow them: a followed response only surfaces after its
      // destination was already requested, and no public mirror may aim this visitor's browser at a private host.
      const response = await fetch(url, { signal: timed, mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error' });
      if (!response.ok) continue;
      const bytes = await readBounded(response, limit);
      if (!bytes || (expect.bytes !== undefined && bytes.byteLength !== expect.bytes)) continue;
      // The hash is checked before anything decodes the bytes; the response's MIME header is ignored.
      if (await digest(bytes) !== media.sha256) continue;
      // The declared type must match the decoded format; without a declaration the bytes decide.
      const type = media.type ?? sniff(bytes);
      if (!isImageType(type) || !magic(bytes, type)) continue;
      const blob = new Blob([bytes as BlobPart], { type });
      const bitmap = await createImageBitmap(blob);
      const actual = `${bitmap.width}x${bitmap.height}`;
      bitmap.close();
      if (expect.dim && actual !== expect.dim) continue;
      const src = URL.createObjectURL(blob);
      issued.add(src);
      return src;
    } catch { /* Try the next declared server; absent media falls back to generic artwork. */ }
  }
  return null;
}

/**
 * Resolve one media blob to an object URL after verifying it, sharing results per hash and expectations.
 * @param media Media descriptor from the manifest or a verified Napshot label.
 * @param servers Blossom servers to try in order; each failure falls through to the next.
 * @param signal Cancellation for navigation.
 * @param expect Optional declared byte length, dimensions and base-path handling.
 * @returns An object URL for verified bytes, or null.
 * @example const src = await verifiedImage(app.icon, app.servers, controller.signal);
 */
export function verifiedImage(media: ManifestMedia, servers: string[], signal: AbortSignal, expect: MediaExpectations = {}): Promise<string | null> {
  if (!servers.length || !crypto?.subtle || typeof createImageBitmap !== 'function') return Promise.resolve(null);
  const key = `${media.sha256}|${expect.bytes ?? ''}|${expect.dim ?? ''}|${expect.keepPath ? 'path' : 'root'}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = fetchVerified(media, servers, signal, expect).catch(() => null);
    cache.set(key, pending);
    void pending.then(result => { if (result === null) cache.delete(key); });
  }
  return pending;
}

/**
 * Revoke every object URL this module issued and forget cached results, for page disposal.
 * @example window.addEventListener('pagehide', releaseImages);
 */
export function releaseImages(): void {
  for (const src of issued) URL.revokeObjectURL(src);
  issued.clear();
  cache.clear();
}
