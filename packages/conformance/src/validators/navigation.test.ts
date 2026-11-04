import { describe, expect, it } from 'vitest';
import { validateEnvelope, knownEnvelopeTypes } from './envelope.js';

const report = { revision: 1, location: { convention: 'napplet:note/open', payload: { event: { tags: [['p', 'alice']] } } } };

describe('NAP-NAVIGATION wire validation', () => {
  it('rejects huge sparse arrays without allocating by their declared length', () => {
    const sparse = new Array(1_000_000_000);
    expect(validateEnvelope({ type: 'navigation.report', id: 'sparse', report: {
      revision: 1, location: { convention: 'napplet:note/open', payload: { event: sparse } },
    } }).ok).toBe(false);
  });
  it('knows exactly the four draft envelopes', () => {
    expect(knownEnvelopeTypes().filter((type) => type.startsWith('navigation.')).sort()).toEqual(['navigation.get', 'navigation.get.result', 'navigation.report', 'navigation.report.result']);
    expect(validateEnvelope({ type: 'navigation.report', id: 'report', report }).ok).toBe(true);
    expect(validateEnvelope({ type: 'navigation.get', id: 'get' }).ok).toBe(true);
    expect(validateEnvelope({ type: 'navigation.get.result', id: 'get', result: {} }).ok).toBe(false);
    expect(validateEnvelope({ type: 'navigation.get', id: '' }).ok).toBe(false);
  });
  it('rejects caller history controls and malformed JSON without imposing semantic schemas', () => {
    expect(validateEnvelope({ type: 'navigation.report', id: 'report', report: { ...report, index: 0 } }).ok).toBe(false);
    expect(validateEnvelope({ type: 'navigation.report', id: 'report', report: { ...report, location: { convention: 'napplet:note/open', payload: [] } } }).ok).toBe(false);
    expect(validateEnvelope({ type: 'navigation.report', id: 'report', report: { revision: 2, location: null } }).ok).toBe(true);
    expect(validateEnvelope({ type: 'navigation.report', id: 'report', report: { revision: 2 ** 53, location: null } }).ok).toBe(true);
  });
});
