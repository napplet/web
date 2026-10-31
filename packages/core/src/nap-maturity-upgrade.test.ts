import { describe, expect, it, vi } from 'vitest';

// Model a later package catalog without mutating the production frozen catalog.
vi.mock('./nap-catalog.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('./nap-catalog.js')>();
  return { ...original, NAP_IMPLEMENTATIONS: {
    ...original.NAP_IMPLEMENTATIONS,
    'future-experiment': { maturity: 'experimental' },
    unclassified: { maturity: null },
    malformed: { maturity: 'stable' },
    missing: {},
  } };
});

import { selectNapDomains } from './nap-maturity.js';

describe('catalog upgrades', () => {
  it('never enables a newly added experiment through an existing named opt-in', () => {
    const result = selectNapDomains({ candidates: ['storage', 'llm', 'future-experiment'], optIn: ['llm'] });
    expect(result.domains).toEqual(['storage', 'llm']);
    expect(result.excluded).toEqual([{ domain: 'future-experiment', reason: 'maturity-not-allowed', maturity: 'experimental' }]);
  });

  it('never enables an unclassified or malformed entry, including explicit opt-ins', () => {
    const names = ['unclassified', 'malformed', 'missing'];
    expect(selectNapDomains({ candidates: names, optIn: names as never[] })).toEqual({
      domains: [], excluded: names.map(domain => ({ domain, reason: 'unclassified' })),
    });
  });
});
