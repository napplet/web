import { describe, expect, it } from 'vitest';
import { validateEnvelope, knownEnvelopeTypes } from './envelope.js';
import { createReferenceShell } from '../shell/reference-shell.js';

describe('NAP-GAMEPAD Wire Protocol', () => {
  it('recognizes exactly the three published messages and no poll/result extension', () => {
    expect(knownEnvelopeTypes().filter((type) => type.startsWith('gamepad.')).sort()).toEqual(['gamepad.state', 'gamepad.subscribe', 'gamepad.unsubscribe']);
    expect(validateEnvelope({ type: 'gamepad.getGamepads', id: 'invented' }).ok).toBe(false);
    expect(validateEnvelope({ type: 'gamepad.subscribe' }).ok).toBe(true);
    expect(validateEnvelope({ type: 'gamepad.unsubscribe' }).ok).toBe(true);
    expect(validateEnvelope({ type: 'gamepad.subscribe', id: 'not-defined' }).errors).toContainEqual(expect.objectContaining({ code: 'forbidden-field', field: 'id', message: expect.stringContaining('NAP-GAMEPAD fire-and-forget') }));
    expect(validateEnvelope({ type: 'gamepad.state', available: true, focused: false, pads: [] }).errors[0].code).toBe('inbound-type-emitted');
  });

  it('provides an immediate unavailability snapshot from the controller-free mock', () => {
    const shell = createReferenceShell();
    expect(shell.handle({ type: 'gamepad.subscribe' })).toEqual([{ type: 'gamepad.state', available: false, reason: 'unavailable', focused: false, pads: [] }]);
    expect(shell.handle({ type: 'gamepad.unsubscribe' })).toEqual([]);
    expect(shell.handle({ type: 'gamepad.subscribe', id: 'invalid' })).toEqual([]);
  });
});
