/** Local BUD-10 helpers: https://github.com/hzrd149/blossom/blob/master/buds/10.md. */
import type { BlossomUri } from '@napplet/core';

const HEX_32 = /^[0-9a-f]{64}$/;
const EXTENSION = /^\.[^/?#\s]+$/;

function checkSize(size: number): void {
  if (!Number.isSafeInteger(size) || size <= 0) throw new Error('Invalid Blossom URI size');
}

function checkAuthors(authors: string[]): void {
  if (authors.some((author) => !HEX_32.test(author))) throw new Error('Invalid Blossom URI author');
}

/**
 * Parse a BUD-10 URI without fetching bytes or resolving discovery hints.
 * @param uri URI containing a lowercase SHA-256 hash and an extension.
 * @returns Parsed reference; hint order and optional schemes are preserved.
 * @example const reference = parseUri(`blossom:${sha256}.png?xs=cdn.example.com`);
 */
export function parseUri(uri: string): BlossomUri {
  const match = /^blossom:([0-9a-f]{64})(\.[^/?#\s]+)(?:\?([^#]*))?$/.exec(uri);
  if (!match) throw new Error('Invalid Blossom URI');
  const query = new URLSearchParams(match[3]);
  const authors = query.getAll('as');
  checkAuthors(authors);
  const reference: BlossomUri = { sha256: match[1], extension: match[2], servers: query.getAll('xs'), authors };
  const size = query.get('sz');
  if (size !== null) {
    if (!/^\d+$/.test(size)) throw new Error('Invalid Blossom URI size');
    reference.size = Number(size);
    checkSize(reference.size);
  }
  return reference;
}

/**
 * Format a BUD-10 URI, defaulting an unknown extension to .bin.
 * @param uri Reference with discovery hints; extension may be empty or omit its leading dot.
 * @returns URI containing the hash, extension, and supplied hints.
 * @example const uri = formatUri({ sha256, extension: '.png', servers: [], authors: [] });
 */
export function formatUri(uri: BlossomUri): string {
  if (!HEX_32.test(uri.sha256)) throw new Error('Invalid Blossom URI hash');
  const extension = uri.extension ? (uri.extension.startsWith('.') ? uri.extension : `.${uri.extension}`) : '.bin';
  if (!EXTENSION.test(extension)) throw new Error('Invalid Blossom URI extension');
  checkAuthors(uri.authors);
  const query = new URLSearchParams();
  for (const server of uri.servers) query.append('xs', server);
  for (const author of uri.authors) query.append('as', author);
  if (uri.size !== undefined) {
    checkSize(uri.size);
    query.set('sz', String(uri.size));
  }
  const suffix = query.toString();
  return `blossom:${uri.sha256}${extension}${suffix ? `?${suffix}` : ''}`;
}
