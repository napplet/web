import { describe, expect, it } from 'vitest';
import type { IntentCandidate, IntentDelivery, IntentInvokeOptions, IntentRequest, IntentResult } from './index.js';

describe('NAP-INTENT public contract', () => {
  it('models normalized requests and manifest parameter contracts', () => {
    const options: IntentInvokeOptions = { payload: { pubkey: 'abc123' }, behavior: { focus: true, reuse: false } };
    const request: IntentRequest = { archetype: 'profile', action: 'open', convention: 'napplet:profile/open', ...options };
    const candidate: IntentCandidate = { id: 'catalog-profile-viewer', actions: ['open'], conventions: ['napplet:profile/open'], contracts: [{ convention: 'napplet:profile/open', params: ['pubkey'] }] };
    expect(request.action).toBe('open');
    expect(candidate.contracts[0].params).toEqual(['pubkey']);
  });

  it('separates acceptance from target delivery', () => {
    const accepted: IntentResult = { ok: true, archetype: 'profile', action: 'open', convention: 'napplet:profile/open', handler: 'catalog-profile-viewer' };
    const rejected: IntentResult = { ok: false, error: 'no handler' };
    const delivery: IntentDelivery = { sender: 'catalog-source', archetype: 'profile', action: 'open', convention: 'napplet:profile/open', payload: { pubkey: 'abc123' } };
    expect(accepted.ok).toBe(true);
    expect(rejected.error).toBe('no handler');
    expect(delivery.sender).toBe('catalog-source');
  });
});
