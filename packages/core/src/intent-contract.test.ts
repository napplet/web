import { describe, expect, it } from 'vitest';
import type {
  IntentCandidate,
  IntentContract,
  IntentDelivery,
  IntentInvokeOptions,
  IntentRequest,
  IntentResult,
} from './index.js';

describe('NAP-INTENT public contract', () => {
  it('models URI-normalized request identity, manifest contracts, and delivery', () => {
    const options: IntentInvokeOptions = {
      payload: { pubkey: 'abc123' },
      handler: 'default',
      behavior: { focus: true, reuse: true },
    };
    const request: IntentRequest = {
      archetype: 'profile',
      action: 'open',
      convention: 'napplet:profile/open',
      ...options,
    };
    const contract: IntentContract = {
      convention: 'napplet:profile/open',
      eventKinds: [0],
    };
    const candidate: IntentCandidate = {
      dTag: 'profile-viewer',
      actions: ['open'],
      conventions: ['napplet:profile/open'],
      contracts: [contract],
    };
    const delivery: IntentDelivery = {
      sender: 'profile-source',
      archetype: request.archetype,
      action: request.action,
      convention: request.convention,
      payload: request.payload,
    };

    expect(candidate.contracts[0]?.eventKinds).toEqual([0]);
    expect(delivery.sender).toBe('profile-source');
  });

  it('separates accepted responsibility from pre-acceptance rejection', () => {
    const accepted: IntentResult = {
      ok: true,
      archetype: 'profile',
      action: 'open',
      convention: 'napplet:profile/open',
      handler: 'profile-viewer',
    };
    const rejected: IntentResult = { ok: false, error: 'no handler' };

    expect(accepted.ok).toBe(true);
    expect(rejected.ok).toBe(false);
  });

  it('rejects retired lifecycle and delivery identifiers at compile time', () => {
    // @ts-expect-error normalized intent identity is required.
    const incompleteRequest: IntentRequest = { archetype: 'profile' };
    // @ts-expect-error acceptance includes every normalized field and handler.
    const incompleteAccepted: IntentResult = { ok: true, archetype: 'profile' };
    // @ts-expect-error handling is not an acceptance result field.
    const handled: IntentResult = { ok: true, archetype: 'profile', action: 'open', convention: 'napplet:profile/open', handler: 'profile-viewer', handled: true };
    // @ts-expect-error window identity is not an acceptance result field.
    const windowed: IntentResult = { ok: true, archetype: 'profile', action: 'open', convention: 'napplet:profile/open', handler: 'profile-viewer', windowId: 'window-1' };
    // @ts-expect-error newWindow is not an adopted lifecycle hint.
    const retiredBehavior: IntentInvokeOptions = { behavior: { newWindow: true } };
    // @ts-expect-error deliveries intentionally have no public identifier.
    const identifiedDelivery: IntentDelivery = { id: 'delivery-1', sender: 'profile-source', archetype: 'profile', action: 'open', convention: 'napplet:profile/open' };

    expect(incompleteRequest).toBeDefined();
    expect(incompleteAccepted).toBeDefined();
    expect(handled).toBeDefined();
    expect(windowed).toBeDefined();
    expect(retiredBehavior).toBeDefined();
    expect(identifiedDelivery).toBeDefined();
  });
});
