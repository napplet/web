import { describe, expect, it } from 'vitest';
import type { ResourceScheme } from './types.js';

const htreeScheme: ResourceScheme = 'htree';

// @ts-expect-error NAP-RESOURCE does not define bare http as a canonical scheme.
const httpScheme: ResourceScheme = 'http';

describe('@napplet/nap/resource types', () => {
  it('includes the canonical htree scheme', () => {
    expect(htreeScheme).toBe('htree');
    expect(httpScheme).toBe('http');
  });
});
