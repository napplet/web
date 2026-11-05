import { describe, expect, it } from 'vitest';
import { selectNapDomains } from '@napplet/core';
import { createReferenceShell, REFERENCE_ENDPOINT } from './reference-shell.js';

const request = { type: 'llm.select', id: 'select-model' };

describe('host domain policy', () => {
  it('blocks direct messages to excluded domains without misclassifying valid envelopes', () => {
    const selection = selectNapDomains({ candidates: ['storage', 'llm'] });
    const shell = createReferenceShell({ domains: selection.domains });
    expect(shell.handle(request)).toEqual([]);
    expect(shell.records[0].verdict.ok).toBe(true);
    expect(shell.handle({ type: 'storage.get', id: 'read', key: 'theme' })).toEqual([
      { type: 'storage.get.result', id: 'read', value: null },
    ]);
  });

  it('intersects the host ceiling with endpoint grants and snapshots the ceiling', () => {
    const domains = ['storage'];
    const shell = createReferenceShell({ domains });
    domains.push('llm');
    expect(shell.handleFrom({ ...REFERENCE_ENDPOINT, domains: ['llm'] }, request)).toEqual([]);
    expect(shell.handleFrom({ ...REFERENCE_ENDPOINT, domains: [] }, { type: 'storage.get', id: 'read', key: 'theme' })).toEqual([]);
  });

  it('permits an explicitly selected experiment and preserves all-domain conformance fixtures', () => {
    const selection = selectNapDomains({ candidates: ['llm'], optIn: ['llm'] });
    expect(createReferenceShell({ domains: selection.domains }).handle(request)).toHaveLength(1);
    expect(createReferenceShell().handle(request)).toHaveLength(1);
    expect(createReferenceShell({ domains: [] }).handle(request)).toEqual([]);
  });
});
