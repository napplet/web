/**
 * Presentation media and source pins for the NIP-5D manifest sidecar.
 *
 * NIP-5D §Presentation media describes each `screenshot` / `preview` blob with
 * NIP-92 `key value` fields: exactly one `x` (sha256 of the complete bytes) and
 * optional `m`, `dim`, `size`, `alt` and, for previews, `duration`. §HTML Metadata
 * for Publishing defines no head mapping for these tags, so they live only in the
 * sidecar event template; supplied bytes are written beside `index.html` so deploy
 * tooling can upload them to the declared Blossom servers.
 */
import { createHash } from 'node:crypto';
import type { Nip5aManifestOptions, Nip5aPreviewOption, Nip5aScreenshotOption } from './types.js';

/** Decoded media bytes to publish alongside the artifact. */
export interface PresentationBlob {
  sha256: string;
  mimeType: string;
  data: Uint8Array;
}

/** Resolved presentation media: manifest tags plus the blobs to write. */
export interface PresentationMediaResult {
  tags: string[][];
  blobs: PresentationBlob[];
}

const SCREENSHOT_FORMATS = new Set(['image/png', 'image/jpeg', 'image/webp']);
const EXTENSIONS: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'video/webm': 'webm', 'video/mp4': 'mp4',
};
const MIME_TYPE = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i;
const SHA256 = /^[0-9a-f]{64}$/;
const DIM = /^[1-9][0-9]*x[1-9][0-9]*$/;

/**
 * Detect a supported presentation format from its leading bytes.
 *
 * @param data - complete media bytes.
 * @returns `image/png`, `image/jpeg`, `image/webp`, `video/webm`, `video/mp4`, or
 *          `undefined` when the bytes match none of them.
 * @example sniffMediaType(readFileSync('shot.png')) // 'image/png'
 */
export function sniffMediaType(data: Uint8Array): string | undefined {
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => data[i] === byte)) return 'image/png';
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
  if (ascii(data, 0, 4) === 'RIFF' && ascii(data, 8, 12) === 'WEBP') return 'image/webp';
  if (data[0] === 0x1a && data[1] === 0x45 && data[2] === 0xdf && data[3] === 0xa3) return 'video/webm';
  if (ascii(data, 4, 8) === 'ftyp') return 'video/mp4';
  return undefined;
}

/**
 * Read pixel dimensions from PNG, JPEG, or WebP headers without decoding pixels.
 *
 * @param data - complete image bytes.
 * @param mimeType - the sniffed or declared image format.
 * @returns width and height, or `undefined` when the header is unreadable.
 * @example imageDimensions(png, 'image/png') // { width: 1200, height: 750 }
 */
export function imageDimensions(data: Uint8Array, mimeType: string): { width: number; height: number } | undefined {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  try {
    if (mimeType === 'image/png' && ascii(data, 12, 16) === 'IHDR') {
      return finite(view.getUint32(16), view.getUint32(20));
    }
    if (mimeType === 'image/jpeg') return jpegDimensions(data, view);
    if (mimeType === 'image/webp') {
      const chunk = ascii(data, 12, 16);
      if (chunk === 'VP8 ') return finite(view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff);
      if (chunk === 'VP8L') {
        const bits = view.getUint32(21, true);
        return finite((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1);
      }
      if (chunk === 'VP8X') return finite(uint24(data, 24) + 1, uint24(data, 27) + 1);
    }
  } catch {
    // Truncated headers carry no dimensions.
  }
  return undefined;
}

function jpegDimensions(data: Uint8Array, view: DataView): { width: number; height: number } | undefined {
  let offset = 2;
  while (offset + 4 <= data.length) {
    if (data[offset] !== 0xff) return undefined;
    const marker = data[offset + 1];
    if (marker === 0xff) { offset += 1; continue; }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { offset += 2; continue; }
    if (marker === 0xd9 || marker === 0xda) return undefined;
    const length = view.getUint16(offset + 2);
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) return finite(view.getUint16(offset + 7), view.getUint16(offset + 5));
    offset += 2 + length;
  }
  return undefined;
}

/**
 * Resolve `screenshots` and `preview` options into manifest tags and blobs.
 *
 * Byte input is hashed, sized, format-sniffed, and (for images) measured; any
 * declared `sha256`, `mimeType`, `size`, or `dim` must agree with the bytes.
 * Hash-only input is emitted as given so a separately uploaded blob can be
 * referenced; omitted `m` or `dim` fields are reported through `warn` because
 * NIP-5D says publishers SHOULD include them.
 *
 * @param options - the plugin options holding `screenshots` and `preview`.
 * @param warn - diagnostic sink for SHOULD-level omissions.
 * @returns tags in option order (screenshots first, then the preview) and the blobs to write.
 * @example
 * const { tags, blobs } = resolvePresentationMedia({ screenshots: [{ data: png }] }, console.warn);
 */
export function resolvePresentationMedia(
  options: Pick<Nip5aManifestOptions, 'screenshots' | 'preview'>,
  warn: (message: string) => void,
): PresentationMediaResult {
  const result: PresentationMediaResult = { tags: [], blobs: [] };
  for (const [index, entry] of (options.screenshots ?? []).entries()) {
    const resolved = resolveEntry('screenshot', entry, `screenshots[${index}]`, warn);
    result.tags.push(resolved.tag);
    if (resolved.blob) result.blobs.push(resolved.blob);
  }
  if (options.preview) {
    const resolved = resolveEntry('preview', options.preview, 'preview', warn);
    result.tags.push(resolved.tag);
    if (resolved.blob) result.blobs.push(resolved.blob);
  }
  return result;
}

/**
 * File extension used when the plugin writes a presentation blob beside `index.html`.
 *
 * @param mimeType - a supported presentation MIME type.
 * @returns the conventional extension, falling back to the MIME subtype.
 * @example blobExtension('image/jpeg') // 'jpg'
 */
export function blobExtension(mimeType: string): string {
  return EXTENSIONS[mimeType.toLowerCase()] ?? mimeType.split('/')[1].replace(/[^a-z0-9]+/gi, '');
}

function resolveEntry(
  kind: 'screenshot' | 'preview',
  entry: Nip5aScreenshotOption | Nip5aPreviewOption,
  label: string,
  warn: (message: string) => void,
): { tag: string[]; blob?: PresentationBlob } {
  const fail: (message: string) => never = (message) => { throw new Error(`[nip5a-manifest] ${label}: ${message}`); };
  const video = kind === 'preview';
  let mimeType = entry.mimeType?.toLowerCase();
  if (mimeType !== undefined && !(video ? MIME_TYPE.test(mimeType) && mimeType.startsWith('video/') : SCREENSHOT_FORMATS.has(mimeType))) {
    fail(video ? 'mimeType must be a video/* type' : 'mimeType must be image/png, image/jpeg, or image/webp');
  }
  if (entry.dim !== undefined && !DIM.test(entry.dim)) fail('dim must be WIDTHxHEIGHT in pixels');
  if (entry.size !== undefined && !(Number.isInteger(entry.size) && entry.size >= 0)) fail('size must be a non-negative integer byte count');
  if (entry.alt !== undefined && !entry.alt.trim()) fail('alt must not be empty');
  const duration = video ? (entry as Nip5aPreviewOption).duration : undefined;
  if (duration !== undefined && !(Number.isFinite(duration) && duration >= 0)) fail('duration must be a non-negative number of seconds');

  let sha256 = entry.sha256;
  let size = entry.size;
  let dim = entry.dim;
  let blob: PresentationBlob | undefined;
  if (entry.data) {
    if (!entry.data.length) fail('data must not be empty');
    const sniffed = sniffMediaType(entry.data);
    const decodable = sniffed !== undefined && (video ? sniffed.startsWith('video/') : SCREENSHOT_FORMATS.has(sniffed));
    if (!decodable) fail(video ? 'data must be WebM or MP4 bytes' : 'data must be PNG, JPEG, or WebP bytes');
    if (mimeType !== undefined && mimeType !== sniffed) fail(`mimeType ${mimeType} does not match the ${sniffed} bytes`);
    mimeType = sniffed;
    const hash = createHash('sha256').update(entry.data).digest('hex');
    if (sha256 !== undefined && sha256 !== hash) fail('sha256 does not match supplied data');
    sha256 = hash;
    if (size !== undefined && size !== entry.data.length) fail('size does not match supplied data');
    size = entry.data.length;
    if (!video) {
      const measured = imageDimensions(entry.data, sniffed);
      const measuredDim = measured ? `${measured.width}x${measured.height}` : undefined;
      if (dim !== undefined && measuredDim !== undefined && dim !== measuredDim) fail(`dim ${dim} does not match the ${measuredDim} image`);
      dim ??= measuredDim;
    }
    blob = { sha256, mimeType: sniffed, data: entry.data };
  }
  if (sha256 === undefined || !SHA256.test(sha256)) fail('requires data or a lowercase sha256');
  if (mimeType === undefined) warn(`[nip5a-manifest] ${label}: NIP-5D recommends an m field; supply mimeType.`);
  if (dim === undefined) warn(`[nip5a-manifest] ${label}: NIP-5D recommends a dim field; supply dim as WIDTHxHEIGHT.`);
  const tag = [kind, `x ${sha256}`];
  if (mimeType !== undefined) tag.push(`m ${mimeType}`);
  if (dim !== undefined) tag.push(`dim ${dim}`);
  if (size !== undefined) tag.push(`size ${size}`);
  if (duration !== undefined) tag.push(`duration ${duration}`);
  if (entry.alt !== undefined) tag.push(`alt ${entry.alt}`);
  return { tag, blob };
}

function ascii(data: Uint8Array, start: number, end: number): string {
  return data.length >= end ? String.fromCharCode(...data.subarray(start, end)) : '';
}

function uint24(data: Uint8Array, offset: number): number {
  if (data.length < offset + 3) throw new RangeError('truncated');
  return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16);
}

function finite(width: number, height: number): { width: number; height: number } | undefined {
  return width > 0 && height > 0 ? { width, height } : undefined;
}
