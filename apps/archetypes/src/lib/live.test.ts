import { afterEach, describe, expect, it } from 'vitest';
import { WebSocketServer } from 'ws';
import { getPublicKey } from 'nostr-tools/pure';
import { diffLive, fetchLive, verifiedManifest, type LiveContext } from './live';
import { alice, bob, named, snapshot } from '../test/fixtures';

const context: LiveContext = {
  generatedAt: 1000,
  relays: [],
  timeoutMs: 1000,
  known: { note: [`35129:${getPublicKey(alice)}:reader`] },
  intents: ['napplet:note/open'],
};

describe('verifiedManifest', () => {
  it('accepts signed manifests and rejects tampered or foreign events', () => {
    const event = named('reader', [['z', 'note']]);
    expect(verifiedManifest(JSON.parse(JSON.stringify(event)))?.id).toBe(event.id);
    expect(verifiedManifest({ ...JSON.parse(JSON.stringify(event)), content: 'changed' })).toBeNull();
    expect(verifiedManifest({ ...JSON.parse(JSON.stringify(event)), kind: 1 })).toBeNull();
    expect(verifiedManifest(null)).toBeNull();
  });
});

describe('diffLive', () => {
  it('reports new napplets per archetype, new archetypes and new intents, ignoring old and known ones', () => {
    const events = [
      named('reader', [['z', 'note']], { at: 2000 }),
      named('reader-old', [['z', 'note']], { at: 900 }),
      named('cards', [['z', 'note'], ['z', 'recipes'], ['i', 'napplet:recipes/open', 'id']], { at: 2100, sk: bob, title: 'Cards' }),
      named('cards', [['z', 'note']], { at: 2050, sk: bob, title: 'Cards (older)' }),
      { ...named('bad', [['z', 'x']], { at: 3000 }), content: '' },
    ];
    const diff = diffLive(context, events);
    expect(diff.releases).toBe(2);
    expect(diff.archetypes.note).toMatchObject({ isNew: false, added: [{ title: 'Cards' }] });
    expect(diff.archetypes.recipes).toMatchObject({ isNew: true });
    expect(diff.intents).toEqual(['napplet:recipes/open']);
    expect(diff.napplets.map(napplet => napplet.title)).toEqual(['Cards']);
  });

  it('does not count a snapshot of a known napplet as new', () => {
    const pinned = snapshot([['z', 'note'], ['a', `35129:${getPublicKey(alice)}:reader`]], { at: 2000 });
    expect(diffLive(context, [pinned]).napplets).toEqual([]);
  });
});

describe('fetchLive', () => {
  let server: WebSocketServer | undefined;
  afterEach(() => new Promise<void>(resolve => { if (!server) return resolve(); for (const client of server.clients) client.terminate(); server.close(() => resolve()); server = undefined; }));

  it('asks each relay for manifests since the build and keeps verified ones', async () => {
    const good = named('fresh', [['z', 'note']], { at: 2000 });
    const requests: unknown[] = [];
    server = new WebSocketServer({ port: 0, host: '127.0.0.1' });
    await new Promise(resolve => server!.once('listening', resolve));
    server.on('connection', socket => socket.on('message', raw => {
      const [, sub, filter] = JSON.parse(String(raw));
      requests.push(filter);
      socket.send(JSON.stringify(['EVENT', sub, good]));
      socket.send(JSON.stringify(['EVENT', sub, { ...good, content: 'forged' }]));
      socket.send(JSON.stringify(['EVENT', 'other', good]));
      socket.send('garbage');
      socket.send(JSON.stringify(['EOSE', sub]));
    }));
    const { port } = server.address() as { port: number };
    const result = await fetchLive([`ws://127.0.0.1:${port}`, 'ws://127.0.0.1:1'], 1000, 1000);
    expect(result.answered).toBe(1);
    expect(result.events.map(event => event.id)).toEqual([good.id]);
    expect(requests[0]).toEqual({ kinds: [5129, 15129, 35129], since: 1001, limit: 500 });
  });

  it('gives up on a silent relay after the timeout', async () => {
    server = new WebSocketServer({ port: 0, host: '127.0.0.1' });
    await new Promise(resolve => server!.once('listening', resolve));
    const { port } = server.address() as { port: number };
    const started = Date.now();
    expect(await fetchLive([`ws://127.0.0.1:${port}`], 1000, 150)).toEqual({ events: [], answered: 0 });
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
