import { describe, expect, it } from 'vitest';
import type { ResourceScheme, ResourceBytesManyMessage, ResourceBytesResultMessage } from './types.js';

const htreeScheme: ResourceScheme = 'htree';

// @ts-expect-error NAP-RESOURCE does not define bare http as a canonical scheme.
const httpScheme: ResourceScheme = 'http';

const bulk: ResourceBytesManyMessage = { type: 'resource.bytesMany', id: 'bulk', urls: ['data:,f'] };
const result: ResourceBytesResultMessage = { type: 'resource.bytes.result', id: 'single', blob: 'Zg==', mime: 'text/plain' };

// @ts-expect-error Wire blobs contain base64 text, never host byte objects.
const invalidBlob: ResourceBytesResultMessage = { ...result, blob: new Blob(['f']) };
// @ts-expect-error Bulk envelopes carry URLs, not resource request objects.
const invalidBulk: ResourceBytesManyMessage = { type: 'resource.bytesMany', id: 'bulk', requests: [{ url: 'data:,f' }] };

describe('@napplet/nap/resource types', () => {
  it('includes the canonical htree scheme', () => {
    expect(htreeScheme).toBe('htree');
    expect(httpScheme).toBe('http');
  });

  it('models JSON resource wire shapes independently of application Blobs', () => {
    expect(JSON.parse(JSON.stringify(bulk))).toEqual({ type: 'resource.bytesMany', id: 'bulk', urls: ['data:,f'] });
    expect(result.blob).toBe('Zg==');
    expect(invalidBlob.blob).toBeInstanceOf(Blob);
    expect(invalidBulk).not.toHaveProperty('urls');
  });
});
