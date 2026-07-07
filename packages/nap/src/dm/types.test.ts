import { describe, expect, it } from 'vitest';
import type {
  DmConversationsResultMessage,
  DmSendResultMessage,
  DmStatusResultMessage,
} from './types.js';

const statusSuccess: DmStatusResultMessage = {
  type: 'dm.status.result',
  id: 's1',
  available: true,
  implementations: ['nip17'],
  capabilities: ['direct'],
};

const statusError: DmStatusResultMessage = {
  type: 'dm.status.result',
  id: 's2',
  error: 'unavailable',
};

const conversationsError: DmConversationsResultMessage = {
  type: 'dm.conversations.result',
  id: 'c1',
  error: 'forbidden',
};

// @ts-expect-error NAP-DM results must carry either success fields or DmError.
const emptyStatusResult: DmStatusResultMessage = {
  type: 'dm.status.result',
  id: 's3',
};

// @ts-expect-error DmError results do not carry success fields.
const mixedSendResult: DmSendResultMessage = {
  type: 'dm.send.result',
  id: 'm1',
  ok: true,
  message: {
    id: 'msg1',
    conversationId: 'c1',
    senderPubkey: 'ab12',
    createdAt: 1790337600,
    content: 'hello',
    status: 'sent',
  },
  error: 'send failed',
};

describe('@napplet/nap/dm result message types', () => {
  it('accepts success and error result envelopes', () => {
    expect(statusSuccess.type).toBe('dm.status.result');
    expect(statusError.error).toBe('unavailable');
    expect(conversationsError.error).toBe('forbidden');
  });
});
