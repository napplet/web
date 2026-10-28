import { describe, expect, it } from 'vitest';
import { finalizeEvent, generateSecretKey } from 'nostr-tools/pure';
import { catalogApp, latestApps } from './catalog';
import snapshot from '../data/discovered-apps.json';
const secret = generateSecretKey();
const sign = (changes: Record<string, unknown> = {}) => finalizeEvent({ kind: 35129, created_at: 100, content: '<img src=x onerror=alert(1)> is plain text', tags: [['d', 'fixture'], ['x', 'a'.repeat(64)], ['title', 'A real test']], ...changes }, secret);

describe('catalog release selection', () => {
  it('reads actual signed upstream current manifests without accepting historical aggregates', () => {
    const selected = snapshot.events.map(event => catalogApp(event)).filter(app => app !== null);
    expect(selected.length).toBeGreaterThan(10);
    expect(selected.some(app => app.name === 'Stick Brawl')).toBe(true);
    for (const event of snapshot.events.filter(event => event.tags.some(tag => tag[0] === 'x' && tag[2] === 'aggregate'))) expect(catalogApp(event)).toBeNull();
  });
  it('preserves publisher descriptions as text, signatures, requirements and address hints', () => {
    const event = sign({ tags: [['d', 'fixture'], ['x', 'a'.repeat(64)], ['R', 'storage'], ['O', 'theme']] });
    const app = catalogApp(event, ['wss://relay.example'])!;
    expect(app.description).toBe(event.content);
    expect(app.requirements).toEqual(['storage']);
    expect(app.pointer).toMatch(/^naddr1/);
    expect(app.event).toBe(event);
    expect(catalogApp(JSON.parse(JSON.stringify({ ...event, content: 'tampered' })))).toBeNull();
  });
  it('uses each own kind and rejects wrong d/x cardinalities and empty descriptions', () => {
    expect(catalogApp(sign({ kind: 5129, tags: [['x', 'a'.repeat(64)]] }))?.pointer).toMatch(/^nevent1/);
    expect(catalogApp(sign({ kind: 15129, tags: [['x', 'a'.repeat(64)]] }))?.pointer).toMatch(/^naddr1/);
    for (const changes of [{kind: 32267}, {content: ''}, {tags: [['x', 'a'.repeat(64)]]}, {kind: 15129}, {tags: [['d', 'x'], ['x', 'a'.repeat(64)], ['x', 'b'.repeat(64)]]}, {tags: [['d', 'x'], ['x', 'a'.repeat(64), 'aggregate']]}, {created_at: 9e14}]) expect(catalogApp(sign(changes))).toBeNull();
  });
  it('keeps newest addressable releases and independent snapshots', () => {
    const older = catalogApp(sign())!;
    const newer = catalogApp(sign({ created_at: 101 }))!;
    const regular = catalogApp(sign({ kind: 5129, tags: [['x', 'b'.repeat(64)]] }))!;
    expect(latestApps([older, regular, newer, newer]).map(app => app.event.id)).toEqual([newer.event.id, regular.event.id]);
  });
});
