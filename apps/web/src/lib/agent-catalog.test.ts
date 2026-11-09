import { describe, expect, it } from 'vitest';
import { buildAgentCatalog } from './agent-catalog';
import { NAPPLETS } from './showcase';
import snapshot from '../data/discovered-apps.json';

describe('buildAgentCatalog', () => {
  const catalog = buildAgentCatalog();

  it('lists the curated picks first, as the app store does', () => {
    const curated = catalog.apps.filter(app => app.collection === 'curated');
    expect(curated.map(app => app.name)).toEqual(NAPPLETS.map(item => item.name));
    expect(catalog.apps.slice(0, curated.length)).toEqual(curated);
  });

  it('lists discovered releases newest first, each with a link to open it', () => {
    const discovered = catalog.apps.filter(app => app.collection === 'discovered');
    expect(discovered.length).toBeGreaterThan(0);
    for (const app of discovered) {
      expect(app.url).toMatch(/^https:\/\//);
      expect(app.name.length).toBeGreaterThan(0);
    }
    const times = discovered.map(app => Date.parse(app.publishedAt!));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it('carries the snapshot time and no raw events', () => {
    expect(catalog.checkedAt).toBe(new Date(snapshot.checkedAt).toISOString());
    expect(JSON.stringify(catalog)).not.toContain('"sig"');
  });
});
