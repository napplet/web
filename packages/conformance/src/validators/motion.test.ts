import { describe, expect, it } from 'vitest';
import { knownEnvelopeTypes, validateEnvelope } from './envelope.js';
import { createReferenceShell } from '../shell/reference-shell.js';

describe('NAP-MOTION Wire Protocol', () => {
  it('recognizes exactly the published messages and their direction', () => {
    expect(knownEnvelopeTypes().filter((type) => type.startsWith('motion.')).sort()).toEqual([
      'motion.permission', 'motion.permission.result', 'motion.sample', 'motion.state', 'motion.subscribe', 'motion.unsubscribe',
    ]);
    for (const type of ['motion.state', 'motion.sample', 'motion.permission.result']) {
      expect(validateEnvelope({ type }).errors[0].code).toBe('inbound-type-emitted');
    }
    expect(validateEnvelope({ type: 'motion.latest', id: 'invented' }).ok).toBe(false);
    expect(validateEnvelope({ type: 'motion.subscribe', frequency: 60 }).ok).toBe(true);
    expect(validateEnvelope({ type: 'motion.permission', id: 'm1', absolute: true }).ok).toBe(true);
    expect(validateEnvelope({ type: 'motion.permission', id: 'm2', absolute: false }).ok).toBe(true);
    expect(validateEnvelope({ type: 'motion.permission', id: 'm3' }).ok).toBe(true);
  });

  it('rejects malformed options and ids on fire-and-forget requests', () => {
    for (const type of ['motion.subscribe', 'motion.unsubscribe']) {
      expect(validateEnvelope({ type }).ok).toBe(true);
      expect(validateEnvelope({ type, id: 'not-defined' }).errors).toContainEqual(expect.objectContaining({ code: 'forbidden-field' }));
    }
    expect(validateEnvelope({ type: 'motion.permission' }).ok).toBe(false);
    for (const absolute of ['true', null, 1]) {
      expect(validateEnvelope({ type: 'motion.permission', id: 'm1', absolute }).ok).toBe(false);
    }
    for (const frequency of ['60', null, NaN, Infinity, -1]) {
      expect(validateEnvelope({ type: 'motion.subscribe', frequency }).ok).toBe(false);
    }
  });

  it('reports unavailable sensors and answers permission requests, including malformed payloads', () => {
    const shell = createReferenceShell();
    expect(shell.handle({ type: 'motion.subscribe' })).toEqual([{
      type: 'motion.state', available: false, reason: 'unavailable', permission: 'prompt',
      absolute: false, focused: false, frequency: 0,
    }]);
    for (const absolute of [undefined, true, 'malformed']) {
      expect(shell.handle({ type: 'motion.permission', id: 'm1', absolute })).toEqual([{
        type: 'motion.permission.result', id: 'm1', permission: 'prompt', absolute: false, error: expect.any(String),
      }]);
    }
    expect(shell.handle({ type: 'motion.unsubscribe' })).toEqual([]);
    expect(shell.handle({ type: 'motion.subscribe', frequency: 'malformed' })).toEqual([]);
    expect(shell.handle({ type: 'motion.subscribe', id: 'invalid' })).toEqual([]);
  });
});
