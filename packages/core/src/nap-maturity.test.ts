import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  NAP_DOMAINS, NAP_IMPLEMENTATIONS, getNapImplementation, selectNapDomains,
} from './index.js';

const root = new URL('../../../', import.meta.url);

describe('release-time NAP implementation catalog', () => {
  it('classifies exactly the shipped domains with traceable evidence', () => {
    expect(Object.keys(NAP_IMPLEMENTATIONS).sort()).toEqual([...NAP_DOMAINS].sort());
    for (const entry of Object.values(NAP_IMPLEMENTATIONS)) {
      expect(entry.proposal.url).toMatch(/^https:\/\/github\.com\/napplet\/naps\/(pull\/\d+|blob\/)/);
      expect(['merged', 'in-review', 'draft', 'unknown']).toContain(entry.proposal.status);
      expect(entry.proposal.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['supported', 'experimental', 'exploratory']).toContain(entry.maturity);
      expect(entry.rationale.length).toBeGreaterThan(30);
      expect(entry.evidence.length).toBeGreaterThan(0);
      for (const path of entry.evidence) expect(existsSync(new URL(path, root)), path).toBe(true);
      if (entry.implementationReference) {
        expect(entry.implementationReference.revision).toMatch(/^[a-f0-9]{40}$/);
        expect(existsSync(new URL(entry.implementationReference.evidence, root))).toBe(true);
      }
    }
  });

  it('keeps upstream state separate from maturity and protects catalog values', () => {
    expect(NAP_IMPLEMENTATIONS.storage).toMatchObject({ maturity: 'supported', proposal: { status: 'in-review' } });
    expect(NAP_IMPLEMENTATIONS.llm).toMatchObject({ maturity: 'exploratory', proposal: { status: 'draft' } });
    expect(Object.isFrozen(NAP_IMPLEMENTATIONS)).toBe(true);
    expect(Object.isFrozen(NAP_IMPLEMENTATIONS.storage.proposal)).toBe(true);
    expect(getNapImplementation('constructor')).toBeUndefined();
    expect(getNapImplementation('__proto__')).toBeUndefined();
  });
});

describe('selectNapDomains', () => {
  it('defaults to supported candidates and explains exclusions', () => {
    expect(selectNapDomains({ candidates: ['llm', 'storage', 'ble', 'identity'] })).toEqual({
      domains: ['storage', 'identity'],
      excluded: [
        { domain: 'llm', reason: 'maturity-not-allowed', maturity: 'exploratory' },
        { domain: 'ble', reason: 'maturity-not-allowed', maturity: 'experimental' },
      ],
    });
  });

  it('admits named experiments without adding unsupported or unauthorized candidates', () => {
    expect(selectNapDomains({ candidates: ['ble', 'llm', 'storage'], optIn: ['llm', 'ble', 'relay'] })).toEqual({
      domains: ['ble', 'llm', 'storage'], excluded: [],
    });
    expect(selectNapDomains({ candidates: [], optIn: ['llm'] }).domains).toEqual([]);
  });

  it('supports explicit maturity levels and empty levels without mutating inputs', () => {
    const candidates = Object.freeze(['storage', 'ble', 'llm', 'storage']);
    expect(selectNapDomains({ candidates, allowedMaturities: ['experimental'] }).domains).toEqual(['ble']);
    expect(selectNapDomains({ candidates, allowedMaturities: [], optIn: ['llm'] }).domains).toEqual(['llm']);
    expect(candidates).toEqual(['storage', 'ble', 'llm', 'storage']);
  });

  it('excludes unknown names even with opt-in and handles duplicate inputs once', () => {
    const result = selectNapDomains({
      candidates: ['storage', 'unknown', 'constructor', '__proto__', 'unknown', 'storage'],
      optIn: ['unknown' as never],
    });
    expect(result.domains).toEqual(['storage']);
    expect(result.excluded).toEqual(['unknown', 'constructor', '__proto__'].map(domain => ({ domain, reason: 'unknown-domain' })));
  });
});
