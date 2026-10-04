import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { finalizeEvent, generateSecretKey } from 'nostr-tools/pure';
import { NAPPLETS } from '../showcase';
import { verifyManifest, verifiedDocument, sha256 } from './verify';

const root = new URL('../../../', import.meta.url);
function fixture(path: string) { return readFileSync(new URL(`public${path}`, root)); }
function manifest(path: string) { return JSON.parse(fixture(path).toString()); }

describe('the curated signed releases', () => {
  for (const entry of NAPPLETS) {
    it(`verifies ${entry.name} against the original signed bytes`, async () => {
      const event = manifest(entry.manifest);
      const identity = await verifyManifest(event, entry.eventId);
      const bytes = fixture(entry.artifact);
      expect(await sha256(bytes)).toBe(identity.artifactHash);
      expect(identity.aggregateHash).toBe(event.tags.find((tag: string[]) => tag[0] === 'x')[1]);
      const doc = await verifiedDocument(bytes, identity.artifactHash);
      expect(doc.endsWith(bytes.toString())).toBe(true);
      expect(doc.indexOf('window.napplet=Object.freeze({})')).toBeLessThan(doc.indexOf(bytes.toString()));
      expect(doc).toContain("connect-src 'none'");
    });
  }

  it('rejects a modified manifest and a different valid release', async () => {
    const entry = NAPPLETS[0];
    const changed = manifest(entry.manifest);
    changed.content = 'tampered';
    await expect(verifyManifest(changed, entry.eventId)).rejects.toThrow('signature');
    await expect(verifyManifest(manifest(entry.manifest), NAPPLETS[1].eventId)).rejects.toThrow('selected');
  });

  it('rejects altered artifact bytes before returning any executable document', async () => {
    const bytes = fixture(NAPPLETS[0].artifact);
    const hash = await sha256(bytes);
    bytes[bytes.length - 1] ^= 1;
    await expect(verifiedDocument(bytes, hash)).rejects.toThrow('signed hash');
  });

  it('rejects an authentically signed but inconsistent aggregate', async () => {
    const original = manifest(NAPPLETS[0].manifest);
    const tags = original.tags.map((tag: string[]) => tag[0] === 'x' ? ['x', '0'.repeat(64), 'aggregate'] : tag);
    const event = finalizeEvent({ kind: original.kind, created_at: original.created_at, content: '', tags }, generateSecretKey());
    await expect(verifyManifest(event, event.id)).rejects.toThrow('aggregate');
  });

  it('ignores non-protocol HTML metadata and permits a missing optional x tag', async () => {
    const original = manifest(NAPPLETS[0].manifest);
    const event = finalizeEvent({ ...original, tags: original.tags.filter((tag: string[]) => tag[0] !== 'x') }, generateSecretKey());
    await expect(verifyManifest(event, event.id)).resolves.toHaveProperty('aggregateHash');
    const plain = new TextEncoder().encode('<h1>Plain app</h1>');
    expect(await verifiedDocument(plain, await sha256(plain))).toContain('<h1>Plain app</h1>');
  });

  it('does not pretend to grant required services unavailable in the preview', async () => {
    const original = manifest(NAPPLETS[0].manifest);
    const event = finalizeEvent({ ...original, tags: [...original.tags, ['requires', 'storage']] }, generateSecretKey());
    await expect(verifyManifest(event, event.id)).rejects.toThrow('unavailable');
  });
});
