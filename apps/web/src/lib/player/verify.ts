/**
 * Verified srcdoc loading adapted from napplet.soy's MIT-licensed runtime.
 * See /showcase/NOTICE.txt. Protocol authority: NIP-5D Identity / Transport,
 * and NIP-5A Content Addressing, not this site's curated-player policy.
 */
import { validateEvent, verifyEvent, type Event } from 'nostr-tools/pure';

export const PLAYER_SANDBOX = 'allow-scripts';
export const PLAYER_CSP = "default-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; worker-src 'none'; child-src 'none'; frame-src 'none'; media-src 'none'; object-src 'none'; manifest-src 'none'; base-uri 'none'; form-action 'none'";
// A size limit for this preview UI, not a protocol or artifact requirement.
const MAX_PREVIEW_BYTES = 5 * 1024 * 1024;

/** Hash the original bytes before injecting any shell-owned content. */
export async function sha256(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Verify the selected signed release, its path and its NIP-5A aggregate. */
export async function verifyManifest(input: unknown, eventId: string) {
  if (!validateEvent(input) || !verifyEvent(input as Event)) {
    throw new Error('The napplet manifest signature could not be verified.');
  }
  const event = input as Event;
  if (event.id !== eventId) throw new Error('This is not the selected napplet release.');
  // The editor currently selects named manifests. Other kinds are not preview entries.
  const identifiers = event.tags.filter((tag) => tag[0] === 'd');
  if (event.kind !== 35129 || identifiers.length !== 1 || !identifiers[0][1]) {
    throw new Error('This release is not a named napplet.');
  }
  const paths = event.tags.filter((tag) => tag[0] === 'path');
  if (paths.length !== 1 || paths[0][1] !== '/index.html' || !/^[a-f0-9]{64}$/.test(paths[0][2])) {
    throw new Error('This preview needs a self-contained index.html release.');
  }
  const artifactHash = paths[0][2];
  const aggregateHash = await sha256(new TextEncoder().encode(`${artifactHash} /index.html\n`));
  const aggregates = event.tags.filter((tag) => tag[0] === 'x');
  if (aggregates.some((tag) => tag[1] !== aggregateHash || tag[2] !== 'aggregate')) {
    throw new Error('The manifest aggregate hash does not match.');
  }
  // This curated preview grants no host services. Full shells are linked alongside it.
  if (event.tags.some((tag) => tag[0] === 'requires')) {
    throw new Error('This release needs a service unavailable in this preview. Open it in its full shell.');
  }
  return { dTag: identifiers[0][1], aggregateHash, artifactHash };
}

/** Adapted from soy's verifiedDocument: verify first, then prepend shell policy. */
export async function verifiedDocument(bytes: Uint8Array, expectedHash: string): Promise<string> {
  if (bytes.length > MAX_PREVIEW_BYTES) throw new Error('This release is too large for the quick preview.');
  if (await sha256(bytes) !== expectedHash) throw new Error('The downloaded napplet does not match its signed hash.');
  const html = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${PLAYER_CSP}"><meta name="referrer" content="no-referrer"><script>window.napplet=Object.freeze({});</script>${html}`;
}

/** Read bounded responses so a failed CDN response cannot consume unbounded memory. */
export async function fetchBytes(url: string, signal: AbortSignal): Promise<Uint8Array> {
  const response = await fetch(url, { signal, credentials: 'omit' });
  if (!response.ok || !response.body) throw new Error('The napplet could not be downloaded. Please try again.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_PREVIEW_BYTES) throw new Error('This release is too large for the quick preview.');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}
