import { describe, it, expect } from 'vitest';
import { NAPPLET_KIND_NAMED, validateManifestEvent, type NappletManifestEvent } from '@napplet/conformance';
import { manifestRows } from './manifest-view.js';

const HASH = 'c'.repeat(64);

function manifest(tags: string[][]): NappletManifestEvent {
  return {
    id: 'b'.repeat(64),
    pubkey: 'a'.repeat(64),
    kind: NAPPLET_KIND_NAMED,
    tags,
    content: 'A test napplet',
  };
}

describe('manifest inspector rows', () => {
  it('shows the artifact x hash and optional domains', () => {
    const event = manifest([
      ['d', 'demo'],
      ['x', HASH],
      ['R', 'relay'],
      ['O', 'theme'],
      ['O', 'notify'],
      ['server', 'https://cdn.example'],
    ]);
    const rows = manifestRows(event, validateManifestEvent(event));
    expect(rows).toContainEqual(['artifact hash (x)', HASH]);
    expect(rows).toContainEqual(['requires', 'relay']);
    expect(rows).toContainEqual(['optional', 'theme, notify']);
    expect(rows.some(([label]) => label.includes('/index.html'))).toBe(false);
  });

  it('leaves the x row empty when the event carries no x tag', () => {
    const event = manifest([['d', 'demo']]);
    const rows = manifestRows(event, validateManifestEvent(event));
    expect(rows).toContainEqual(['artifact hash (x)', undefined]);
  });
});
