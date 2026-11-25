import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { getPublicKey } from 'nostr-tools/pure';
import { buildIndex, families } from './model';
import { parseCuration } from './curation';
import { parseRelease, type Release } from './release';
import { alice, bob, carol, named, snapshot } from '../test/fixtures';

const releases = (...events: Parameters<typeof parseRelease>[0][]) => events.map(event => parseRelease(event)).filter((r): r is Release => r !== null);

describe('families', () => {
  it('keeps the newest revision and folds snapshots into their lineage or same-titled napplet', () => {
    const pk = getPublicKey(alice);
    const v1 = named('viewer', [['z', 'viewer']], { at: 100, title: 'Viewer' });
    const v2 = named('viewer', [['z', 'viewer']], { at: 200, title: 'Viewer' });
    const pinned = snapshot([['a', `35129:${pk}:viewer`]], { at: 150 });
    const sameTitle = snapshot([], { at: 160, title: 'Viewer' });
    const orphan = snapshot([], { at: 170, title: 'Orphan' });
    const out = families(releases(v1, v2, pinned, sameTitle, orphan));
    expect(out).toHaveLength(2);
    const viewer = out.find(family => family.head.kind === 35129)!;
    expect(viewer.head.id).toBe(v2.id);
    expect(viewer.members).toHaveLength(3);
    expect(viewer.firstSeen).toBe(100);
  });
});

describe('buildIndex', () => {
  const pk = (sk: Uint8Array) => getPublicKey(sk);
  const events = [
    named('reader', [['z', 'note'], ['i', 'napplet:note/open']], { at: 100, title: 'Reader' }),
    named('reader', [['z', 'note'], ['i', 'napplet:note/open', 'id']], { at: 300, title: 'Reader' }),
    named('feed', [['z', 'note'], ['i', 'napplet:note/open']], { at: 200, sk: bob, title: 'Feed' }),
    named('pad', [['z', 'text-editor'], ['i', 'napplet:text-editor/open'], ['i', 'napplet:text-editor/edit']], { at: 120, sk: carol, title: 'Pad', content: 'A plain text pad' }),
    named('levels', [['z', 'game'], ['z', 'editor']], { at: 130, sk: carol, title: 'Levels', content: 'Game with a level editor' }),
    named('orphan-intent', [['i', 'napplet:profile/open', 'pubkey']], { at: 140, title: 'Who' }),
    named('silent', [], { at: 150, title: 'Silent' }),
    { ...named('broken', []), content: '' },
  ];

  it('counts napplets, publishers, intents, parameters and agreement', () => {
    const index = buildIndex(events, { generatedAt: 999 });
    expect(index).toMatchObject({ generatedAt: 999, releases: 7, napplets: 6, publishers: 3, silent: 1 });
    const note = index.archetypes.find(entry => entry.slug === 'note')!;
    expect(note).toMatchObject({ publishers: 2, intents: ['napplet:note/open'], firstSeen: 100, lastSeen: 300, status: 'observed' });
    expect(note.napplets.map(napplet => napplet.title)).toEqual(['Reader', 'Feed']);
    const open = index.intents.find(intent => intent.uri === 'napplet:note/open')!;
    expect(open).toMatchObject({ agreement: 'mixed', publishers: 2, params: [{ name: 'id', count: 1 }] });
    expect(open.handlers.map(handler => [handler.napplet.title, handler.since])).toEqual([['Reader', 100], ['Feed', 200]]);
    expect(index.verbs[0]).toEqual({ verb: 'open', archetypes: ['note', 'profile', 'text-editor'], handlers: 4 });
  });

  it('lists an archetype only reached through an intent, flagging the missing z tag', () => {
    const index = buildIndex(events);
    const profile = index.archetypes.find(entry => entry.slug === 'profile')!;
    expect(profile.napplets).toEqual([]);
    expect(index.intents.find(intent => intent.uri === 'napplet:profile/open')!.handlers[0].advertisesArchetype).toBe(false);
  });

  it('suggests clusters, ignoring names one napplet advertises together', () => {
    const index = buildIndex(events);
    expect(index.clusters.map(cluster => [cluster.id, cluster.status])).toEqual([['editor~text-editor', 'candidate']]);
    expect(index.archetypes.find(entry => entry.slug === 'editor')!.status).toBe('candidate');
    expect(index.archetypes.find(entry => entry.slug === 'game')!.related).toEqual([{ slug: 'editor', detail: 'advertised together by 1 napplet' }]);
  });

  it('applies curation: diverse notes, coalesced groups, distinct pairs and parameter rows', () => {
    const curation = parseCuration(`
archetypes:
  note: { status: diverse, note: Many shapes. }
clusters:
  - members: [editor, text-editor]
    outcome: coalesce
    preferred: text-editor
    params:
      - same: [id, pubkey]
        note: identifiers
`);
    const index = buildIndex(events, { curation });
    const note = index.archetypes.find(entry => entry.slug === 'note')!;
    expect(note).toMatchObject({ status: 'diverse', note: 'Many shapes.' });
    const editor = index.archetypes.find(entry => entry.slug === 'editor')!;
    expect(editor).toMatchObject({ status: 'coalesced', preferred: 'text-editor', aliases: ['text-editor'] });
    expect(index.archetypes.find(entry => entry.slug === 'text-editor')).toMatchObject({ status: 'coalesced', aliases: ['editor'] });
    expect(index.archetypes.find(entry => entry.slug === 'text-editor')!.preferred).toBeUndefined();
    const cluster = index.clusters[0];
    expect(cluster).toMatchObject({ id: 'editor~text-editor', status: 'coalesce', preferred: 'text-editor' });
    expect(cluster.paramRows[0]).toMatchObject({ aligned: true, note: 'identifiers' });
    const distinct = buildIndex(events, { curation: parseCuration('clusters: [{ members: [editor, text-editor], outcome: distinct }]') });
    expect(distinct.archetypes.find(entry => entry.slug === 'editor')!.status).toBe('observed');
    expect(distinct.clusters.map(cluster => cluster.status)).toEqual(['distinct']);
  });

  it('indexes the checked-in seed snapshot', () => {
    const seed = JSON.parse(readFileSync(new URL('../data/snapshot.json', import.meta.url), 'utf8'));
    const index = buildIndex(seed.events, { generatedAt: seed.generatedAt, curation: parseCuration(readFileSync(new URL('../../curation.yaml', import.meta.url), 'utf8')) });
    expect(index.archetypes.length).toBeGreaterThan(10);
    expect(index.archetypes[0].slug).toBe('game');
    expect(index.clusters.map(cluster => cluster.id)).toEqual(expect.arrayContaining(['3d-model~cad-viewer', 'incident~incident-command', 'editor~text-editor']));
    expect(index.clusters.map(cluster => cluster.id)).not.toContain('article~highlight');
    expect(pk(alice)).toHaveLength(64);
  });
});
