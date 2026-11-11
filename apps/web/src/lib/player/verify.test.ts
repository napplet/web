import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { finalizeEvent, generateSecretKey } from 'nostr-tools/pure';
import { NAPPLETS } from '../showcase';
import { verifyArchivedRelease, verifyRelease, verifiedDocument, sha256 } from './verify';

const TRUSTED_TYPES = "require-trusted-types-for 'script'; trusted-types default";
const PRELUDE = '<script data-kehto-nip5d-injection>';

const root = new URL('../../../', import.meta.url);
function fixture(path: string) { return readFileSync(new URL(`public${path}`, root)); }
function manifest(path: string) { return JSON.parse(fixture(path).toString()); }

describe('the selected signed releases', () => {
  for (const entry of NAPPLETS) {
    it(`verifies ${entry.name} against the original signed bytes`, async () => {
      const event = manifest(entry.manifest);
      const identity = await verifyRelease(event, entry.eventId, entry.format);
      const bytes = fixture(entry.artifact);
      expect(await sha256(bytes)).toBe(identity.artifactHash);
      const doc = await verifiedDocument(bytes, identity.artifactHash);
      const firstAuthoredScript = doc.indexOf('<script', doc.indexOf(PRELUDE) + PRELUDE.length);
      expect(doc.indexOf('http-equiv="Content-Security-Policy"')).toBeLessThan(doc.indexOf(PRELUDE));
      if (firstAuthoredScript !== -1) expect(doc.indexOf(PRELUDE)).toBeLessThan(firstAuthoredScript);
      expect(doc).toContain("connect-src 'none'");
      expect(doc).toContain(TRUSTED_TYPES);
    });
  }

  it('rejects a modified manifest and a different valid release', async () => {
    const entry = NAPPLETS.find(app => app.format === 'archive')!;
    const changed = manifest(entry.manifest);
    changed.content = 'tampered';
    await expect(verifyArchivedRelease(changed, entry.eventId)).rejects.toThrow('signature');
    await expect(verifyArchivedRelease(manifest(entry.manifest), NAPPLETS[1].eventId)).rejects.toThrow('selected');
  });

  it('rejects altered artifact bytes before returning any executable document', async () => {
    const bytes = fixture(NAPPLETS[0].artifact);
    const hash = await sha256(bytes);
    bytes[bytes.length - 1] ^= 1;
    await expect(verifiedDocument(bytes, hash)).rejects.toThrow('signed hash');
  });

  it('rejects an authentically signed but inconsistent aggregate', async () => {
    const original = manifest(NAPPLETS.find(app => app.format === 'archive')!.manifest);
    const tags = original.tags.map((tag: string[]) => tag[0] === 'x' ? ['x', '0'.repeat(64), 'aggregate'] : tag);
    const event = finalizeEvent({ kind: original.kind, created_at: original.created_at, content: '', tags }, generateSecretKey());
    await expect(verifyArchivedRelease(event, event.id)).rejects.toThrow('aggregate');
  });

  it('requires the archived hash chain and does not require embedded metadata', async () => {
    const original = manifest(NAPPLETS.find(app => app.format === 'archive')!.manifest);
    const event = finalizeEvent({ ...original, tags: original.tags.filter((tag: string[]) => tag[0] !== 'x') }, generateSecretKey());
    await expect(verifyArchivedRelease(event, event.id)).rejects.toThrow('aggregate');
    const plain = new TextEncoder().encode('<h1>Plain app</h1>');
    expect(await verifiedDocument(plain, await sha256(plain))).toContain('<h1>Plain app</h1>');
  });

  it('does not pretend to grant required services unavailable in the preview', async () => {
    const original = manifest(NAPPLETS.find(app => app.format === 'archive')!.manifest);
    const event = finalizeEvent({ ...original, tags: [...original.tags, ['requires', 'storage']] }, generateSecretKey());
    await expect(verifyArchivedRelease(event, event.id)).rejects.toThrow('unavailable');
  });
});


describe('the WebRTC exfiltration hardening', () => {
  async function prepared(markup: string) {
    const bytes = new TextEncoder().encode(markup);
    return verifiedDocument(bytes, await sha256(bytes));
  }

  it('prepends the Kehto CSP and prelude with the nested-context lock on by default', async () => {
    const doc = await prepared('<!doctype html><html><head><title>t</title></head><body><script>run()</script></body></html>');
    expect(doc.startsWith('<!doctype html>')).toBe(true);
    expect(doc).toContain("frame-src 'none'");
    expect(doc).toContain("child-src 'none'");
    expect(doc).toContain(TRUSTED_TYPES);
    // The prelude removes the RTC* constructor surface and installs the frame lock before authored scripts.
    expect(doc).toContain('webkitRTCPeerConnection');
    expect(doc).toMatch(/createPolicy\(['"]default['"]/);
    expect(doc).toContain('napplets may not create nested browsing contexts');
    expect(doc.indexOf(PRELUDE)).toBeLessThan(doc.indexOf('<script>run()'));
  });

  it('keeps standards mode for an artifact without a doctype', async () => {
    expect((await prepared('<h1>Plain app</h1>')).startsWith('<!doctype html>')).toBe(true);
  });

  it.each(['<iframe srcdoc="x"></iframe>', '<object data="x"></object>', '<embed src="x">', '<template><frame></template>'])(
    'rejects static frame markup before load: %s',
    async markup => {
      await expect(prepared(`<!doctype html><body>${markup}</body>`)).rejects.toThrow('embeds its own frames');
    },
  );
});

describe('current release identity', () => {
  it('rejects legacy aggregates through the current path', async () => {
    const entry = NAPPLETS.find(app => app.format === 'archive')!;
    await expect(verifyRelease(manifest(entry.manifest), entry.eventId, 'current')).rejects.toThrow('direct artifact-hash');
  });

  it('rejects a signed current release requiring unavailable services', async () => {
    const selected = NAPPLETS.find(app => app.format === 'current')!;
    const original = manifest(selected.manifest);
    const event = finalizeEvent({ ...original, tags: [...original.tags, ['R', 'storage']] }, generateSecretKey());
    await expect(verifyRelease(event, event.id, 'current')).rejects.toThrow('unavailable');
  });
});
