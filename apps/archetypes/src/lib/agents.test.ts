import { describe, expect, it } from 'vitest';
import { archetypeMarkdown, archetypesJson, indexMarkdown, llmsFullTxt, llmsTxt } from './agents';
import { buildIndex } from './model';
import { readSnapshot } from './data';
import { named } from '../test/fixtures';

const site = 'https://archetypes.example';
const events = [
  named('viewer', [['z', '3d-model'], ['i', 'napplet:3d-model/open', 'url', 'route']], { at: 1_790_000_000, title: 'Viewer <b>' }),
  named('pad', [['z', 'editor']], { at: 1_790_000_100, title: 'Pad' }),
];
const index = buildIndex(events, { generatedAt: 1_790_000_200 });
const snapshot = readSnapshot({ version: 1, generatedAt: 1_790_000_200, siteUrl: site, events, runtime: { relays: ['wss://relay.example', 'javascript:alert(1)'], timeoutMs: 5000 } });

describe('Markdown twins', () => {
  it('renders an archetype with tags, intents, implementations and the non-normative note', () => {
    const md = archetypeMarkdown(index.archetypes.find(entry => entry.slug === '3d-model')!, index, site);
    expect(md).toContain('# 3d-model');
    expect(md).toContain('["z", "3d-model"]');
    expect(md).toContain('["i","napplet:3d-model/open","route","url"]');
    expect(md).toContain('- napplet:3d-model/open: 1 handler; parameter names: route (1), url (1); https://archetypes.example/intents/3d-model/open/');
    expect(md).toContain('Viewer \\<b\\>');
    expect(md).toMatch(/nostr:naddr1/);
    expect(md).toContain('Observed usage, not a registry.');
  });

  it('lists clusters, aliases, notes and nearby names', async () => {
    const { parseCuration } = await import('./curation');
    const curated = buildIndex(events, { generatedAt: 1, curation: parseCuration('archetypes: { editor: { note: A level editor. } }\nclusters: [{ members: [3d-model, editor], outcome: coalesce, preferred: 3d-model }]') });
    const md = archetypeMarkdown(curated.archetypes.find(entry => entry.slug === 'editor')!, curated, site);
    expect(md).toContain('Coalesced: listed under 3d-model.');
    expect(md).toContain('Also published as: 3d-model.');
    expect(md).toContain('Curator note: A level editor.');
    expect(md).toContain('- 3d-model ≈ editor (coalesced): https://archetypes.example/clusters/3d-model~editor/');
  });

  it('notes archetypes without intents', () => {
    expect(archetypeMarkdown(index.archetypes.find(entry => entry.slug === 'editor')!, index, site)).toContain('None advertised.');
  });

  it('builds llms.txt, llms-full.txt and the index page', () => {
    expect(llmsTxt(index, site)).toMatch(/^# Napplet archetypes\n\n> /);
    expect(llmsTxt(index, site)).toContain('- [3d-model](https://archetypes.example/archetypes/3d-model.md): 1 napplet; intents: napplet:3d-model/open');
    expect(indexMarkdown(index, site)).toContain('2 archetypes, 1 intents');
    expect(llmsFullTxt(index, site).split('# ').length).toBeGreaterThan(3);
  });
});

describe('archetypes.json', () => {
  it('exports counts, params and live relays without raw events', () => {
    const json = archetypesJson(index, snapshot);
    expect(json.totals).toMatchObject({ napplets: 2, archetypes: 2, intents: 1 });
    expect(json.archetypes.find(entry => entry.slug === '3d-model')).toMatchObject({ params: ['route', 'url'], url: `${site}/archetypes/3d-model/` });
    expect(json.live).toEqual({ relays: ['wss://relay.example'], since: 1_790_000_200 });
    expect(JSON.stringify(json)).not.toContain('"sig"');
  });
});

describe('readSnapshot', () => {
  it('rejects bad snapshots and fills defaults', () => {
    expect(() => readSnapshot({ version: 2 })).toThrow(/version/);
    expect(() => readSnapshot({ version: 1, events: {} })).toThrow(/events/);
    expect(() => readSnapshot({ version: 1, events: [], generatedAt: 'x' })).toThrow(/generatedAt/);
    expect(() => readSnapshot({ version: 1, events: [], generatedAt: 1 })).toThrow(/runtime/);
    expect(readSnapshot({ version: 1, events: [], generatedAt: 1, siteUrl: 'http://x', runtime: { relays: [], timeoutMs: -1 } })).toMatchObject({ siteUrl: 'https://archetypes.napplet.run', runtime: { timeoutMs: 8000 }, relayHints: {}, relays: [] });
  });
});
