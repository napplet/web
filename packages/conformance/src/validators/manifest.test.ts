import { describe, it, expect } from 'vitest';
import { validateManifest, findInlineScripts } from './manifest.js';

const HASH = 'a'.repeat(64);

function html(parts: { head?: string; body?: string }): string {
  return `<!doctype html><html><head>${parts.head ?? ''}</head><body>${parts.body ?? ''}</body></html>`;
}

describe('validateManifest — happy path', () => {
  it('accepts a well-formed built manifest', () => {
    const doc = html({
      head: `
        <meta name="napplet-type" content="hello-napplet">
        <meta name="napplet-aggregate-hash" content="${HASH}">
        <meta name="napplet-requires" content="relay,storage">
        <script type="module" src="/assets/app.js"></script>
      `,
    });
    const v = validateManifest(doc);
    expect(v.ok, JSON.stringify(v.errors)).toBe(true);
    expect(v.nappletType).toBe('hello-napplet');
    expect(v.requires).toEqual(['relay', 'storage']);
  });

  it('accepts nap:-prefixed requires and a valid connect origin', () => {
    const doc = html({
      head: `
        <meta name="napplet-type" content="x">
        <meta name="napplet-aggregate-hash" content="${HASH}">
        <meta name="napplet-requires" content="nap:relay, nap:identity">
        <meta name="napplet-connect-requires" content="https://api.example.com wss://stream.example.com">
      `,
    });
    const v = validateManifest(doc);
    expect(v.ok, JSON.stringify(v.errors)).toBe(true);
    expect(v.connectOrigins).toContain('https://api.example.com');
  });
});

describe('validateManifest — failures', () => {
  it('flags a missing napplet-type', () => {
    const v = validateManifest(html({ head: `<meta name="napplet-aggregate-hash" content="${HASH}">` }));
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.code === 'missing-napplet-type')).toBe(true);
  });

  it('flags an invalid napplet-type', () => {
    const v = validateManifest(html({ head: `<meta name="napplet-type" content="Bad Type!"><meta name="napplet-aggregate-hash" content="${HASH}">` }));
    expect(v.errors.some((e) => e.code === 'invalid-napplet-type')).toBe(true);
  });

  it('flags an unknown required NAP', () => {
    const v = validateManifest(html({ head: `<meta name="napplet-type" content="x"><meta name="napplet-aggregate-hash" content="${HASH}"><meta name="napplet-requires" content="relay,telepathy">` }));
    expect(v.errors.some((e) => e.code === 'unknown-required-nap')).toBe(true);
  });

  it('rejects a config schema using the forbidden pattern keyword', () => {
    const schema = JSON.stringify({ type: 'object', properties: { name: { type: 'string', pattern: '^x' } } });
    const v = validateManifest(html({ head: `<meta name="napplet-type" content="x"><meta name="napplet-aggregate-hash" content="${HASH}"><meta name="napplet-config-schema" content='${schema}'>` }));
    expect(v.errors.some((e) => e.code === 'invalid-config-schema')).toBe(true);
  });

  it('accepts an HTML-entity-escaped config schema (as the build plugin actually emits it)', () => {
    // The vite-plugin serializes the schema with &quot; in the content attribute.
    const escaped = JSON.stringify({ type: 'object', properties: { accentColor: { type: 'string', enum: ['blue', 'green'] } }, required: ['accentColor'] })
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;');
    const v = validateManifest(html({ head: `<meta name="napplet-type" content="x"><meta name="napplet-config-schema" content="${escaped}">` }));
    expect(v.ok, JSON.stringify(v.errors)).toBe(true);
    expect(v.errors.some((e) => e.code === 'invalid-config-schema')).toBe(false);
  });

  it('rejects an invalid connect origin', () => {
    const v = validateManifest(html({ head: `<meta name="napplet-type" content="x"><meta name="napplet-aggregate-hash" content="${HASH}"><meta name="napplet-connect-requires" content="https://*.example.com">` }));
    expect(v.errors.some((e) => e.code === 'invalid-connect-origin')).toBe(true);
  });
});

describe('findInlineScripts / inline-script rule', () => {
  it('allows external, json, ld+json, importmap, speculationrules', () => {
    const doc = html({
      head: `
        <script src="/a.js"></script>
        <script type="application/json">{"a":1}</script>
        <script type="application/ld+json">{"@context":"x"}</script>
        <script type="importmap">{"imports":{}}</script>
        <script type="speculationrules">{"prefetch":[]}</script>
      `,
    });
    expect(findInlineScripts(doc)).toHaveLength(0);
  });

  it('flags inline, module-inline, and empty-src scripts', () => {
    const doc = html({ body: `<script>alert(1)</script><script type="module">x()</script><script src="">y()</script>` });
    expect(findInlineScripts(doc)).toHaveLength(3);
  });

  it('ignores commented-out scripts', () => {
    const doc = html({ body: `<!-- <script>nope()</script> -->` });
    expect(findInlineScripts(doc)).toHaveLength(0);
  });

  it('surfaces inline scripts as manifest errors', () => {
    const v = validateManifest(html({ head: `<meta name="napplet-type" content="x"><meta name="napplet-aggregate-hash" content="${HASH}">`, body: `<script>boom()</script>` }));
    expect(v.errors.some((e) => e.code === 'inline-script')).toBe(true);
  });
});
