import { describe, expect, it } from 'vitest';
import { clip, day, intentPath, kindLabel, plural, pointer, shortNpub, stamp } from './format';

describe('format', () => {
  it('formats dates, counts, paths and labels', () => {
    expect(day(0)).toBe('1970-01-01');
    expect(stamp(90)).toBe('1970-01-01 00:01 UTC');
    expect(plural(1, 'napplet')).toBe('1 napplet');
    expect(plural(2, 'napplet')).toBe('2 napplets');
    expect(intentPath('napplet:note/open')).toBe('/intents/note/open/');
    expect(kindLabel(5129)).toBe('snapshot');
    expect(kindLabel(1)).toBe('1');
    expect(clip('one two three four', 9)).toBe('one two…');
    expect(clip('short', 9)).toBe('short');
  });

  it('encodes publishers and pointers', () => {
    const pubkey = 'f'.repeat(64);
    expect(shortNpub(pubkey)).toMatch(/^npub1.{4}….{4}$/);
    expect(shortNpub('zz')).toBe('zz…');
    expect(pointer({ id: 'a'.repeat(64), kind: 5129, pubkey, identifier: '', relays: [] })).toMatch(/^nevent1/);
    expect(pointer({ id: 'a'.repeat(64), kind: 35129, pubkey, identifier: 'x', relays: ['wss://r'] })).toMatch(/^naddr1/);
  });
});
