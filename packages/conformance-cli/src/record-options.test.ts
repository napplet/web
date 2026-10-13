import { describe, expect, it } from 'vitest';
import { parseRecordActions, parseRecordArgs } from './record-options.js';

describe('recording authoring controls', () => {
  it('defaults to six seconds and accepts explicit capture settings', () => {
    expect(parseRecordArgs([])).toMatchObject({ duration: 6000, width: 960, height: 600, interactive: false });
    expect(parseRecordArgs(['dist', '--interactive', '--duration', '8000', '--width', '480', '--height', '800'])).toMatchObject({ directory: 'dist', interactive: true, duration: 8000, width: 480, height: 800 });
  });
  it('rejects ambiguous modes and invalid limits before capture', () => {
    for (const args of [['--interactive', '--actions', 'a.json'], ['--duration', '0'], ['--width', 'NaN'], ['--output', 'x.mp4'], ['--wat', '1'], ['dist', '--artifact', 'a.html']]) {
      expect(() => parseRecordArgs(args)).toThrow();
    }
  });
  it('validates and orders real input recipes without executing code', () => {
    const options = parseRecordArgs([]);
    const actions = [{ type: 'keyUp', atMs: 1000, key: 'ArrowRight' }, { type: 'click', atMs: 0, x: 100, y: 100 }];
    expect(parseRecordActions(actions, options).map(a => a.type)).toEqual(['click', 'keyUp']);
    for (const input of [[{ type: 'click', atMs: 0, x: 960, y: 0 }], [{ type: 'keyDown', atMs: 6000, key: 'a' }], [{ type: 'eval', atMs: 0, script: 'alert(1)' }]]) {
      expect(() => parseRecordActions(input, options)).toThrow();
    }
  });
});
