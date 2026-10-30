/** Render manifest media only from bytes whose hash and format were verified, as NIP-5D requires. */
import { normalizeBlossomServer } from 'applesauce-common/helpers';
import { isImageType, type ManifestMedia } from './catalog';

const cache = new Map<string, Promise<string | null>>();

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

async function fetchVerified(media: ManifestMedia, servers: string[], signal: AbortSignal): Promise<string | null> {
  for (const server of servers) {
    try {
      const response = await fetch(new URL(media.sha256, normalizeBlossomServer(server)), { signal, mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!response.ok) continue;
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > 8_000_000 || await digest(bytes) !== media.sha256) continue;
      // The declared type must match the decoded format; without a declaration the bytes decide.
      const type = media.type ?? sniff(bytes);
      if (!isImageType(type) || !magic(bytes, type)) continue;
      const blob = new Blob([bytes], { type });
      const bitmap = await createImageBitmap(blob);
      bitmap.close();
      return URL.createObjectURL(blob);
    } catch { /* Try the next declared server; absent media falls back to generic artwork. */ }
  }
  return null;
}

/**
 * Resolve one manifest media blob to an object URL after verifying it, sharing results per hash.
 * @param media Media descriptor from the manifest.
 * @param servers The manifest's declared Blossom servers.
 * @param signal Cancellation for navigation.
 * @returns An object URL for verified bytes, or null.
 * @example const src = await verifiedImage(app.icon, app.servers, controller.signal);
 */
export function verifiedImage(media: ManifestMedia, servers: string[], signal: AbortSignal): Promise<string | null> {
  if (!servers.length || !crypto?.subtle || typeof createImageBitmap !== 'function') return Promise.resolve(null);
  let pending = cache.get(media.sha256);
  if (!pending) {
    pending = fetchVerified(media, servers, signal).catch(() => null);
    cache.set(media.sha256, pending);
    void pending.then(result => { if (result === null) cache.delete(media.sha256); });
  }
  return pending;
}
