import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { nip5aManifest, type Nip5aManifestOptions } from './index';
import { readPublishingMetadata } from './publishing-metadata';
import { resolvePublishingIcon } from './publishing-icon';

const fixtureHtml = fs.readFileSync(fileURLToPath(new URL('../../../tests/fixtures/publishing-metadata.html', import.meta.url)), 'utf8');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMQCVgAAAGAAQUSaopEAAAAAElFTkSuQmCC', 'base64');
const icons = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../../../tests/fixtures/publishing-icons.json', import.meta.url)), 'utf8')) as Array<{ mimeType: 'image/png' | 'image/jpeg' | 'image/webp'; base64: string; sha256: string }>;
const hash = (data: string | Uint8Array): string => createHash('sha256').update(data).digest('hex');
const roots: string[] = [];
afterEach(() => { roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })); vi.restoreAllMocks(); });

async function publish(html: string, options: Partial<Nip5aManifestOptions> = {}, source = '') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'publishing-meta-')); roots.push(root);
  const outDir = path.join(root, 'dist'); fs.mkdirSync(outDir);
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  const plugin = nip5aManifest({ nappletType: 'portable-notes', ...options });
  await (plugin.configResolved as Function)({ root, build: { outDir } });
  const context = { warn: vi.fn() };
  if (source) await (plugin.transform as Function).call(context, source, path.join(root, 'app.ts'));
  await (plugin.closeBundle as Function).call(context);
  const output = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(outDir, '.nip5a-manifest.json'), 'utf8')) as { content: string; tags: string[][]; artifactHash: string };
  return { root, outDir, output, manifest };
}

describe('NIP-5D HTML Metadata for Publishing', () => {
  it.each(icons)('embeds and hashes real $mimeType bytes', async (icon) => {
    const { output, manifest } = await publish('<head></head>', { description: 'Image fixture', icon: { data: Buffer.from(icon.base64, 'base64'), mimeType: icon.mimeType } });
    expect(manifest.tags).toContainEqual(['icon', icon.sha256, icon.mimeType]);
    expect(readPublishingMetadata(output).icons).toEqual([{ href: `data:${icon.mimeType};base64,${icon.base64}`, type: icon.mimeType }]);
  });
  it('round-trips every named-event mapping, entities and icon bytes', async () => {
    const { output, manifest } = await publish(fixtureHtml);
    const metadata = readPublishingMetadata(output);
    for (const tag of metadata.tags.filter((t) => t[0] !== 'description')) expect(manifest.tags).toContainEqual(tag);
    expect(manifest.content).toBe('Notes with "quotes" & <tags>');
    expect(manifest.tags).toContainEqual(['title', 'Read & write 📝']);
    expect(manifest.tags).toContainEqual(['i', 'napplet:feed/edit', 'filters', 'relays']);
    expect(manifest.tags.filter((t) => t[0] === 'R')).toEqual([['R', 'relay'], ['R', 'storage']]);
    expect(manifest.tags).toContainEqual(['icon', hash(png), 'image/png']);
    expect(metadata.icons).toEqual([{ href: `data:image/png;base64,${png.toString('base64')}`, type: 'image/png' }]);
    expect(manifest.tags.filter((t) => t[0] === 'x')).toEqual([['x', hash(output)]]);
    expect(manifest.artifactHash).toBe(hash(output));
    expect(output.indexOf('<meta charset="utf-8">')).toBeLessThan(output.indexOf('<link rel="icon"'));
    expect(output).not.toContain(hash(output));
    expect(output).not.toMatch(/napplet-(?:x|pubkey|sig|created_at)/);
    for (const unchanged of ['<meta charset="utf-8">', '<meta name="viewport" content="width=device-width">', "<script>window.example = '<meta name=\"napplet-requires\" content=\"script-fake\">';</script>", '<!-- <meta name="napplet-requires" content="comment-fake"> -->']) expect(output).toContain(unchanged);
  });

  it('resolves explicit options, inference, optional overlap, stale declarations and duplicates once', async () => {
    const html = fixtureHtml.replace('</head>', '<title>Duplicate</title><meta name="napplet-parent" content="old"><meta name="napplet-root" content="old"></head>');
    const { output, manifest } = await publish(html, {
      title: 'New </title><script>bad()</script> & "text"', description: 'New "description" <value>\r\nSecond line',
      nappletType: 'configured', requires: { infer: true, explicit: ['storage'] }, optional: ['theme'],
      archetypes: [{ slug: 'profile', convention: 'napplet:profile/open', params: ['pubkey'] }],
      intents: [{ intent: 'napplet:profile/edit', params: ['fields'] }], source: 'https://new.example/?a=1&b=2', servers: [],
      icon: { data: png, mimeType: 'image/png' },
    }, "import '@napplet/nap/relay'; import '@napplet/nap/theme';");
    const tags = readPublishingMetadata(output).tags;
    expect(tags.filter((t) => t[0] === 'description')).toEqual([['description', manifest.content]]);
    expect(tags.filter((t) => t[0] === 'title')).toEqual([['title', 'New </title><script>bad()</script> & "text"']]);
    expect(tags.filter((t) => t[0] === 'R')).toEqual([['R', 'relay'], ['R', 'storage']]);
    expect(tags.filter((t) => t[0] === 'O')).toEqual([['O', 'theme']]);
    expect(tags.filter((t) => t[0] === 'z')).toEqual([['z', 'profile']]);
    expect(tags.filter((t) => t[0] === 'i')).toEqual([['i', 'napplet:profile/open', 'pubkey'], ['i', 'napplet:profile/edit', 'fields']]);
    expect(tags.filter((t) => ['server', 'a', 'A'].includes(t[0]))).toEqual([]);
    expect(manifest.tags.filter((t) => ['server', 'a', 'A'].includes(t[0]))).toEqual([]);
    expect(output).not.toContain('<script>bad()');
    const again = await publish(output, { nappletType: 'configured' });
    expect(again.output).toBe(output);
  });

  it.each(['<!doctype html><body><p>Body</p>', '<html><title>Author</title><script>const n=1;</script><body>Body', '<html><head><meta charset="utf-8"><body>Body'])('creates or uses a real head in abbreviated HTML: %s', async (html) => {
    const { output, manifest } = await publish(html, { description: 'Description' });
    expect(readPublishingMetadata(output).tags).toContainEqual(['description', 'Description']);
    expect(output).toContain('Body');
    expect(manifest.artifactHash).toBe(hash(output));
  });

  it('does not require optional metadata declarations', async () => {
    const { manifest } = await publish('<head><meta name="description" content="Minimal"></head>');
    expect(manifest.tags.map((t) => t[0])).toEqual(['d', 'x']);
  });

  it('uses author optional domains when checking inferred requirements', async () => {
    const { manifest } = await publish(fixtureHtml, { requires: { infer: true, explicit: ['relay'], mode: 'error' } }, "import '@napplet/nap/relay'; import '@napplet/nap/theme';");
    expect(manifest.tags.filter((t) => t[0] === 'R')).toEqual([['R', 'relay']]);
    expect(manifest.tags).toContainEqual(['O', 'theme']);
  });

  it('retains hash-only icon callers without inventing bytes and rejects a conflicting byte hash', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { output, manifest } = await publish('<head></head>', { description: 'Minimal', icon: { sha256: hash(png), mimeType: 'image/png' } });
    expect(manifest.tags).toContainEqual(['icon', hash(png), 'image/png']);
    expect(readPublishingMetadata(output).icons).toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('icon.data'));
    await expect(publish(fixtureHtml, { icon: { sha256: '0'.repeat(64), data: png, mimeType: 'image/png' } })).rejects.toThrow('does not match');
  });

  it('ignores unsupported and malformed URLs and decodes percent-encoded binary bytes', () => {
    expect(resolvePublishingIcon(undefined, [{ href: 'data:image/svg+xml,<svg/>' }, { href: 'data:image/png;base64,!!!' }, { href: 'https://remote.example/icon.png' }])).toBeUndefined();
    const url = `data:image/png,${[...png].map((b) => `%${b.toString(16).padStart(2, '0')}`).join('')}`;
    expect(resolvePublishingIcon(undefined, [{ href: url }])?.sha256).toBe(hash(png));
  });

  it('hashes the final HTML after a real Vite build inlines JavaScript and CSS', async () => {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'publishing-vite-'))); roots.push(root);
    fs.writeFileSync(path.join(root, 'index.html'), '<html><head><title>App</title></head><body><script type="module" src="/main.js"></script></body></html>');
    fs.writeFileSync(path.join(root, 'main.js'), 'import "./style.css"; document.body.dataset.ready = "yes";');
    fs.writeFileSync(path.join(root, 'style.css'), 'body { color: red; }');
    const outDir = path.join(root, 'dist');
    await build({ root, configFile: false, logLevel: 'silent', plugins: [nip5aManifest({ nappletType: 'real-build', description: 'Built app', icon: { data: png, mimeType: 'image/png' } })], build: { outDir } });
    const output = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
    const manifest = JSON.parse(fs.readFileSync(path.join(outDir, '.nip5a-manifest.json'), 'utf8'));
    expect(manifest.tags).toContainEqual(['x', hash(output)]);
    expect(output).toContain('<style>');
    expect(output).toContain('dataset.ready');
    expect(fs.readdirSync(outDir).sort()).toEqual(['.nip5a-manifest.json', 'index.html']);
  });
});
