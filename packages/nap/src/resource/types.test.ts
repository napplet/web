import { describe, expect, it } from 'vitest';
import type { ResourceScheme } from './types.js';

const htreeScheme: ResourceScheme = 'htree';
const hashtreeScheme: ResourceScheme = 'hashtree';

// @ts-expect-error NAP-RESOURCE does not define bare http as a canonical scheme.
const httpScheme: ResourceScheme = 'http';

describe('@napplet/nap/resource types', () => {
  it('includes both canonical Hashtree schemes', () => {
    expect(htreeScheme).toBe('htree');
    expect(hashtreeScheme).toBe('hashtree');
    expect(httpScheme).toBe('http');
  });
});
