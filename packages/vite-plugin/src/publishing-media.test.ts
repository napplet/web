import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { blobExtension, imageDimensions, resolvePresentationMedia, sniffMediaType } from './publishing-media';

const fixtures = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../../../tests/fixtures/publishing-icons.json', import.meta.url)), 'utf8')) as Array<{ mimeType: string; base64: string; sha256: string }>;
const bytes = (mimeType: string): Uint8Array => Uint8Array.from(Buffer.from(fixtures.find((f) => f.mimeType === mimeType)!.base64, 'base64'));
const hash = (data: Uint8Array): string => createHash('sha256').update(data).digest('hex');
const ascii = (text: string): number[] => [...text].map((c) => c.charCodeAt(0));

/** PNG signature + IHDR header with the given canvas; pixel data is irrelevant to header parsing. */
function pngHeader(width: number, height: number): Uint8Array {
  const out = new Uint8Array(33);
  out.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, ...ascii('IHDR')]);
  new DataView(out.buffer).setUint32(16, width);
  new DataView(out.buffer).setUint32(20, height);
  return out;
}

/** SOI, an APP0 segment, a DQT segment, then a progressive SOF2 frame header. */
function jpegHeader(width: number, height: number): Uint8Array {
  const sof = [0xff, 0xc2, 0, 11, 8, height >> 8, height & 0xff, width >> 8, width & 0xff, 1, 1, 0x11, 0];
  return Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xff, 0xdb, 0, 3, 0, ...sof]);
}

function webpHeader(chunk: 'VP8L' | 'VP8X', width: number, height: number): Uint8Array {
  const out = new Uint8Array(40);
  out.set([...ascii('RIFF'), 32, 0, 0, 0, ...ascii('WEBP'), ...ascii(chunk)]);
  const view = new DataView(out.buffer);
  if (chunk === 'VP8L') {
    out[20] = 0x2f;
    view.setUint32(21, (width - 1) | ((height - 1) << 14), true);
  } else {
    view.setUint32(24, width - 1, true);
    view.setUint32(27, height - 1, true);
  }
  return out;
}

describe('sniffMediaType', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp'])('recognises real %s bytes', (mimeType) => {
    expect(sniffMediaType(bytes(mimeType))).toBe(mimeType);
  });
  it('recognises WebM and MP4 containers and rejects everything else', () => {
    expect(sniffMediaType(Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, 1, 2]))).toBe('video/webm');
    expect(sniffMediaType(Uint8Array.from([0, 0, 0, 24, ...ascii('ftypisom')]))).toBe('video/mp4');
    expect(sniffMediaType(Uint8Array.from(ascii('<svg/>')))).toBeUndefined();
    expect(sniffMediaType(Uint8Array.from(ascii('RIFF....WAVE')))).toBeUndefined();
    expect(sniffMediaType(new Uint8Array())).toBeUndefined();
  });
});

describe('imageDimensions', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp'])('measures the 1x1 %s fixture', (mimeType) => {
    expect(imageDimensions(bytes(mimeType), mimeType)).toEqual({ width: 1, height: 1 });
  });
  it('reads PNG IHDR, JPEG SOF after other segments, and every WebP chunk layout', () => {
    expect(imageDimensions(pngHeader(1200, 750), 'image/png')).toEqual({ width: 1200, height: 750 });
    expect(imageDimensions(jpegHeader(640, 480), 'image/jpeg')).toEqual({ width: 640, height: 480 });
    expect(imageDimensions(webpHeader('VP8L', 300, 200), 'image/webp')).toEqual({ width: 300, height: 200 });
    expect(imageDimensions(webpHeader('VP8X', 4096, 2160), 'image/webp')).toEqual({ width: 4096, height: 2160 });
  });
  it('returns undefined for truncated, zero-sized, or foreign headers', () => {
    expect(imageDimensions(pngHeader(1200, 750).subarray(0, 20), 'image/png')).toBeUndefined();
    expect(imageDimensions(pngHeader(0, 750), 'image/png')).toBeUndefined();
    expect(imageDimensions(Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0, 2]), 'image/jpeg')).toBeUndefined();
    expect(imageDimensions(Uint8Array.from([0xff, 0xd8, 0x00]), 'image/jpeg')).toBeUndefined();
    expect(imageDimensions(bytes('image/png'), 'image/webp')).toBeUndefined();
    expect(imageDimensions(bytes('image/webp'), 'video/webm')).toBeUndefined();
  });
});

describe('resolvePresentationMedia', () => {
  const png = bytes('image/png');
  const webm = Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86]);

  it('derives x, m, dim and size from bytes and keeps option order', () => {
    const warn = vi.fn();
    const result = resolvePresentationMedia({
      screenshots: [{ data: png, alt: 'First frame' }, { data: bytes('image/jpeg') }],
      preview: { data: webm, dim: '960x600', duration: 8.5, alt: 'Building a bridge' },
    }, warn);
    expect(result.tags).toEqual([
      ['screenshot', `x ${hash(png)}`, 'm image/png', 'dim 1x1', `size ${png.length}`, 'alt First frame'],
      ['screenshot', `x ${hash(bytes('image/jpeg'))}`, 'm image/jpeg', 'dim 1x1', `size ${bytes('image/jpeg').length}`],
      ['preview', `x ${hash(webm)}`, 'm video/webm', 'dim 960x600', `size ${webm.length}`, 'duration 8.5', 'alt Building a bridge'],
    ]);
    expect(result.blobs.map((blob) => [blob.sha256, blob.mimeType])).toEqual([[hash(png), 'image/png'], [hash(bytes('image/jpeg')), 'image/jpeg'], [hash(webm), 'video/webm']]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('accepts declarations that agree with the bytes and rejects those that do not', () => {
    const ok = resolvePresentationMedia({ screenshots: [{ data: png, sha256: hash(png), mimeType: 'image/png', dim: '1x1', size: png.length }] }, vi.fn());
    expect(ok.tags[0]).toEqual(['screenshot', `x ${hash(png)}`, 'm image/png', 'dim 1x1', `size ${png.length}`]);
    expect(() => resolvePresentationMedia({ screenshots: [{ data: png, sha256: '0'.repeat(64) }] }, vi.fn())).toThrow('sha256 does not match');
    expect(() => resolvePresentationMedia({ screenshots: [{ data: png, mimeType: 'image/jpeg' }] }, vi.fn())).toThrow('does not match the image/png bytes');
    expect(() => resolvePresentationMedia({ screenshots: [{ data: png, dim: '2x2' }] }, vi.fn())).toThrow('does not match the 1x1 image');
    expect(() => resolvePresentationMedia({ screenshots: [{ data: png, size: 1 }] }, vi.fn())).toThrow('size does not match');
  });

  it('emits hash-only entries as given and warns about recommended fields', () => {
    const warn = vi.fn();
    const result = resolvePresentationMedia({ screenshots: [{ sha256: 'a'.repeat(64) }], preview: { sha256: 'b'.repeat(64), mimeType: 'video/mp4', dim: '1x1' } }, warn);
    expect(result.tags).toEqual([['screenshot', `x ${'a'.repeat(64)}`], ['preview', `x ${'b'.repeat(64)}`, 'm video/mp4', 'dim 1x1']]);
    expect(result.blobs).toEqual([]);
    expect(warn.mock.calls.map(([message]) => message)).toEqual([
      expect.stringContaining('screenshots[0]: NIP-5D recommends an m field'),
      expect.stringContaining('screenshots[0]: NIP-5D recommends a dim field'),
    ]);
  });

  it('warns once when a preview cannot be measured from bytes', () => {
    const warn = vi.fn();
    resolvePresentationMedia({ preview: { data: webm } }, warn);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('preview: NIP-5D recommends a dim field'));
  });

  it.each([
    [{ screenshots: [{}] }, 'requires data or a lowercase sha256'],
    [{ screenshots: [{ sha256: 'A'.repeat(64) }] }, 'requires data or a lowercase sha256'],
    [{ screenshots: [{ data: new Uint8Array() }] }, 'data must not be empty'],
    [{ screenshots: [{ data: Uint8Array.from(ascii('<svg/>')) }] }, 'data must be PNG, JPEG, or WebP bytes'],
    [{ screenshots: [{ data: webm }] }, 'data must be PNG, JPEG, or WebP bytes'],
    [{ screenshots: [{ sha256: 'a'.repeat(64), mimeType: 'image/gif' as 'image/png' }] }, 'mimeType must be image/png, image/jpeg, or image/webp'],
    [{ screenshots: [{ sha256: 'a'.repeat(64), dim: '1200' }] }, 'dim must be WIDTHxHEIGHT'],
    [{ screenshots: [{ sha256: 'a'.repeat(64), size: -1 }] }, 'size must be a non-negative integer'],
    [{ screenshots: [{ sha256: 'a'.repeat(64), alt: ' ' }] }, 'alt must not be empty'],
    [{ preview: { data: png } }, 'data must be WebM or MP4 bytes'],
    [{ preview: { sha256: 'a'.repeat(64), mimeType: 'image/png' } }, 'mimeType must be a video/* type'],
    [{ preview: { sha256: 'a'.repeat(64), duration: -1 } }, 'duration must be a non-negative number'],
  ])('rejects %j with a labelled error', (options, message) => {
    expect(() => resolvePresentationMedia(options, vi.fn())).toThrow(message);
    expect(() => resolvePresentationMedia(options, vi.fn())).toThrow(/^\[nip5a-manifest\] (screenshots\[0\]|preview): /);
  });

  it('maps supported MIME types to conventional blob extensions', () => {
    expect(['image/png', 'image/jpeg', 'image/webp', 'video/webm', 'video/mp4', 'video/x-matroska'].map(blobExtension)).toEqual(['png', 'jpg', 'webp', 'webm', 'mp4', 'xmatroska']);
  });
});
