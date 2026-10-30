import { describe, expect, it } from 'vitest';
import { formatUri, parseUri } from './uri.js';

// Published vectors from BUD-10's Combined Parameters and Minimal URI examples.
const hash = 'b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553';
const author = 'ec4425ff5e9446080d2f70440188e3ca5d6da8713db7bdeef73d0ed54d9093f0';

describe('BUD-10 URI helpers', () => {
  it('parses the published combined vector without losing hint ordering', () => {
    expect(parseUri(`blossom:${hash}.pdf?xs=cdn.satellite.earth&as=${author}&xs=blossom.primal.net&sz=184292`)).toEqual({
      sha256: hash, extension: '.pdf', servers: ['cdn.satellite.earth', 'blossom.primal.net'], authors: [author], size: 184292,
    });
  });
  it('formats the minimal vector and defaults unknown extensions', () => {
    expect(formatUri({ sha256: hash, extension: '.pdf', servers: [], authors: [] })).toBe(`blossom:${hash}.pdf`);
    expect(formatUri({ sha256: hash, extension: '', servers: [], authors: [] })).toBe(`blossom:${hash}.bin`);
  });
  it('round-trips schemes, repeated hints, and size without network access', () => {
    const reference = { sha256: hash, extension: '.pdf', servers: ['https://cdn.example.com', 'http://cdn.example.net', 'cdn.example.org'], authors: [author, author], size: 184292 };
    expect(parseUri(formatUri(reference))).toEqual(reference);
  });
  it('ignores unknown query hints for forward compatibility', () => {
    expect(parseUri(`blossom:${hash}.pdf?future=1`).sha256).toBe(hash);
  });
  it.each([
    `https:${hash}.pdf`, `blossom:${hash}`, `blossom:${hash}.`, `blossom:${hash.toUpperCase()}.pdf`,
    `blossom:${hash}.pdf?sz=0`, `blossom:${hash}.pdf?sz=-1`, `blossom:${hash}.pdf?sz=1.5`,
    `blossom:${hash}.pdf?sz=9007199254740992`, `blossom:${hash}.pdf?as=invalid`,
  ])('rejects malformed URI %s', (uri) => { expect(() => parseUri(uri)).toThrow(); });
  it('rejects invalid formatting fields', () => {
    const reference = { sha256: hash, extension: '.pdf', servers: [], authors: [] };
    expect(() => formatUri({ ...reference, sha256: 'bad' })).toThrow('hash');
    expect(() => formatUri({ ...reference, extension: '.pdf?sz=3' })).toThrow('extension');
    expect(() => formatUri({ ...reference, size: 0 })).toThrow('size');
    expect(() => formatUri({ ...reference, authors: ['bad'] })).toThrow('author');
  });
});
