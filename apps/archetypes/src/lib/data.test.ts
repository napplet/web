import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { named } from '../test/fixtures';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('loadSiteData', () => {
  it('reads the snapshot and curation named by the environment, once', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'arch-data-'));
    const events = [named('pad', [['z', 'editor']]), named('notes', [['z', 'text-editor'], ['i', 'napplet:text-editor/open']])];
    writeFileSync(join(dir, 'snapshot.json'), JSON.stringify({ version: 1, generatedAt: 5, siteUrl: 'https://archetypes.example', events, runtime: { relays: ['wss://relay.example'], timeoutMs: 100 } }));
    writeFileSync(join(dir, 'curation.yaml'), 'clusters: [{ members: [editor, text-editor], outcome: coalesce, preferred: text-editor }]\n');
    vi.stubEnv('ARCHETYPES_SNAPSHOT', join(dir, 'snapshot.json'));
    vi.stubEnv('ARCHETYPES_CURATION', join(dir, 'curation.yaml'));
    const { loadSiteData } = await import('./data');
    const data = loadSiteData();
    expect(data.snapshot.siteUrl).toBe('https://archetypes.example');
    expect(data.index.archetypes.find(entry => entry.slug === 'editor')?.preferred).toBe('text-editor');
    expect(loadSiteData()).toBe(data);
  });

  it('falls back to the checked-in seed and curation', async () => {
    const { loadSiteData } = await import('./data');
    const data = loadSiteData();
    expect(data.snapshot.events.length).toBeGreaterThan(100);
    expect(data.curation.archetypes.note?.status).toBe('diverse');
  });
});
