/** NAP-RESOURCE web binding for canonical base64 wire bytes. */

/**
 * Validate wire bytes and construct the application-facing Blob.
 * @param value Canonical padded base64 from a resource result or sidecar.
 * @param mime Runtime-classified media type.
 * @returns A Blob containing decoded octets.
 * @example
 * decodeResourceBlob('AAEC/w==', 'application/octet-stream');
 * @see https://github.com/napplet/naps/pull/80
 */
export function decodeResourceBlob(value: unknown, mime: unknown): Blob {
  if (typeof value !== 'string' || typeof mime !== 'string' || value.length % 4 !== 0) {
    throw new Error('decode-failed: invalid resource bytes or MIME');
  }
  let binary: string;
  try {
    binary = atob(value);
  } catch {
    throw new Error('decode-failed: invalid resource base64');
  }
  // Round-trip rejects whitespace, missing padding, URL-safe alphabet, and nonzero pad bits.
  if (btoa(binary) !== value) throw new Error('decode-failed: non-canonical resource base64');
  return new Blob([Uint8Array.from(binary, (character) => character.charCodeAt(0))], { type: mime });
}
