import { describe, expect, it } from 'vitest';
import { handleClassMessage } from './class/shim.js';
import { handleConfigMessage } from './config/shim.js';
import { handleCvmMessage } from './cvm/shim.js';
import { handleIdentityMessage } from './identity/shim.js';
import { handleKeysMessage } from './keys/shim.js';
import { handleMediaMessage } from './media/shim.js';
import { handleNotifyMessage } from './notify/shim.js';
import { handleOutboxMessage } from './outbox/shim.js';
import { handleResourceMessage } from './resource/shim.js';

describe('shim message boundary guards', () => {
  it('ignores unknown message types without throwing', () => {
    const message = { type: 'unknown.domain' };

    expect(() => handleClassMessage(message)).not.toThrow();
    expect(() => handleConfigMessage(message)).not.toThrow();
    expect(() => handleCvmMessage(message)).not.toThrow();
    expect(() => handleIdentityMessage(message)).not.toThrow();
    expect(() => handleKeysMessage(message)).not.toThrow();
    expect(() => handleMediaMessage(message)).not.toThrow();
    expect(() => handleNotifyMessage(message)).not.toThrow();
    expect(() => handleOutboxMessage(message)).not.toThrow();
    expect(() => handleResourceMessage(message)).not.toThrow();
  });

  it('treats malformed known message types as boundary no-ops when no request is pending', () => {
    expect(() => handleConfigMessage({ type: 'config.values' })).not.toThrow();
    expect(() => handleCvmMessage({ type: 'cvm.request.result' })).not.toThrow();
    expect(() => handleIdentityMessage({ type: 'identity.changed' })).not.toThrow();
    expect(() => handleKeysMessage({ type: 'keys.registerAction.result' })).not.toThrow();
    expect(() => handleMediaMessage({ type: 'media.session.create.result' })).not.toThrow();
    expect(() => handleNotifyMessage({ type: 'notify.send.result' })).not.toThrow();
    expect(() => handleOutboxMessage({ type: 'outbox.query.result' })).not.toThrow();
    expect(() => handleResourceMessage({ type: 'resource.bytes.error' })).not.toThrow();
  });
});
