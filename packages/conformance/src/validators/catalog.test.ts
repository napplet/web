import { describe, expect, it } from 'vitest';
import { knownEnvelopeTypes, validateEnvelope } from './envelope.js';
import { createReferenceShell } from '../shell/reference-shell.js';

describe('NAP-CATALOG wire protocol', () => {
  it('recognizes only the published request and result, with a request correlation id', () => {
    expect(knownEnvelopeTypes().filter(type => type.startsWith('catalog.')).sort()).toEqual(['catalog.get', 'catalog.get.result']);
    expect(validateEnvelope({ type: 'catalog.get', id: 'c1' }).ok).toBe(true);
    expect(validateEnvelope({ type: 'catalog.get' }).ok).toBe(false);
    expect(validateEnvelope({ type: 'catalog.get', id: 1 }).ok).toBe(false);
    expect(validateEnvelope({ type: 'catalog.launch', id: 'c1' }).ok).toBe(false);
    expect(validateEnvelope({ type: 'catalog.get.result', id: 'c1', snapshot: { napplets: [], handlers: [] } }).errors[0].code).toBe('inbound-type-emitted');
  });

  it('returns an empty snapshot and preserves request correlation', () => {
    const shell = createReferenceShell({ manifests: [] });
    expect(shell.handle({ type: 'catalog.get', id: 'empty' })).toEqual([
      { type: 'catalog.get.result', id: 'empty', snapshot: { napplets: [], handlers: [] } },
    ]);
    expect(shell.handleFrom({ id: 'denied', catalogId: 'denied', domains: [] }, { type: 'catalog.get', id: 'denied' })).toEqual([]);
  });
});
