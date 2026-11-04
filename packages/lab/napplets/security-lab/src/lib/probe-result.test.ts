import { describe, expect, it } from 'vitest';
import { pass, fail, warning, info, skipped, errorText, short } from './probe-result';

describe('probe-result builders', () => {
  it('tag their status and carry observed + evidence', () => {
    expect(pass('Allowed', 'no direct channel')).toEqual({ observed: 'Allowed', evidence: 'no direct channel', status: 'pass' });
    expect(fail('Leaked', 'reached origin').status).toBe('fail');
    expect(warning('Unavailable', 'runtime denied').status).toBe('warning');
    expect(info('Available', 'documented gap').status).toBe('info');
  });

  it('skipped marks deferred probes', () => {
    const result = skipped('not applicable');
    expect(result.status).toBe('skipped');
    expect(result.observed).toBe('Deferred');
  });
});

describe('formatting helpers', () => {
  it('errorText renders Error name + message, stringifies non-errors', () => {
    expect(errorText(new TypeError('boom'))).toBe('TypeError: boom');
    expect(errorText('plain')).toBe('plain');
  });

  it('short truncates strings over 160 chars with an ellipsis', () => {
    const out = short('x'.repeat(200));
    expect(out.length).toBe(160);
    expect(out.endsWith('...')).toBe(true);
  });

  it('short leaves short strings intact and survives unserializable values', () => {
    expect(short('tiny')).toBe('tiny');
    expect(short(undefined)).toBe('undefined');
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(short(cyclic)).toBe('[object Object]');
  });
});
