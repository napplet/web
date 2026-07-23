import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOPICS } from '@napplet/core';
import { handleConfigMessage } from './config/shim.js';
import { handleCvmMessage } from './cvm/shim.js';
import { handleIdentityMessage } from './identity/shim.js';
import { handleIncEvent, installIncShim, on } from './inc/shim.js';
import { handleIntentMessage } from './intent/shim.js';
import { handleKeysMessage } from './keys/shim.js';
import { handleMediaMessage } from './media/shim.js';
import { handleNotifyMessage } from './notify/shim.js';
import { handleOutboxMessage } from './outbox/shim.js';
import { handleResourceMessage } from './resource/shim.js';
import { handleUploadMessage } from './upload/shim.js';

beforeEach(() => {
  vi.stubGlobal('window', { parent: { postMessage: vi.fn() } });
});

afterEach(() => {
  installIncShim()();
  vi.unstubAllGlobals();
});

describe('shim message boundary guards', () => {
  it('ignores unknown message types without throwing', () => {
    const message = { type: 'unknown.domain' };

    expect(() => handleConfigMessage(message)).not.toThrow();
    expect(() => handleCvmMessage(message)).not.toThrow();
    expect(() => handleIdentityMessage(message)).not.toThrow();
    expect(() => handleIntentMessage(message)).not.toThrow();
    expect(() => handleKeysMessage(message)).not.toThrow();
    expect(() => handleMediaMessage(message)).not.toThrow();
    expect(() => handleNotifyMessage(message)).not.toThrow();
    expect(() => handleOutboxMessage(message)).not.toThrow();
    expect(() => handleResourceMessage(message)).not.toThrow();
    expect(() => handleUploadMessage(message)).not.toThrow();
  });

  it('treats malformed known message types as boundary no-ops when no request is pending', () => {
    expect(() => handleConfigMessage({ type: 'config.values' })).not.toThrow();
    expect(() => handleCvmMessage({ type: 'cvm.request.result' })).not.toThrow();
    expect(() => handleIdentityMessage({ type: 'identity.changed' })).not.toThrow();
    expect(() => handleIntentMessage({ type: 'intent.invoke.result' })).not.toThrow();
    expect(() => handleKeysMessage({ type: 'keys.registerAction.result' })).not.toThrow();
    expect(() => handleMediaMessage({ type: 'media.session.create.result' })).not.toThrow();
    expect(() => handleNotifyMessage({ type: 'notify.send.result' })).not.toThrow();
    expect(() => handleOutboxMessage({ type: 'outbox.query.result' })).not.toThrow();
    expect(() => handleResourceMessage({ type: 'resource.bytes.error' })).not.toThrow();
    expect(() => handleUploadMessage({ type: 'upload.upload.result' })).not.toThrow();
  });

  it('routes the advisory archetype open topics as opaque strings', () => {
    const topics = [TOPICS.NOTE_OPEN, TOPICS.PROFILE_OPEN, TOPICS.DM_OPEN];
    const received: Array<{ topic: string; payload: unknown }> = [];

    expect(topics).toEqual([
      'napplet:note/open',
      'napplet:profile/open',
      'napplet:dm/open',
    ]);

    for (const topic of topics) {
      on(topic, (payload, event) => {
        received.push({ topic: event.tags[0]?.[1] ?? '', payload });
      });
      handleIncEvent({
        type: 'inc.event',
        topic,
        sender: 'local-example',
        payload: { local: true },
      });
    }

    expect(received).toEqual(topics.map((topic) => ({ topic, payload: { local: true } })));
  });
});
