import { describe, it, expect } from 'vitest';
import { validateManifest } from './manifest.js';

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

  it('accepts nap:-prefixed requires', () => {
    const doc = html({
      head: `
        <meta name="napplet-type" content="x">
        <meta name="napplet-aggregate-hash" content="${HASH}">
        <meta name="napplet-requires" content="nap:relay, nap:identity">
      `,
    });
    const v = validateManifest(doc);
    expect(v.ok, JSON.stringify(v.errors)).toBe(true);
    expect(v.requires).toEqual(['nap:relay', 'nap:identity']);
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
});

describe('inline scripts are not a conformance failure', () => {
  it('does not flag inline <script> elements (NIP-5D srcdoc napplets carry inline JS) — napplet/web#53', () => {
    const v = validateManifest(
      html({
        head: `<meta name="napplet-type" content="x"><meta name="napplet-aggregate-hash" content="${HASH}">`,
        body: `<script type="module">window.boot = true; alert(1)</script>`,
      }),
    );
    expect(v.errors).toHaveLength(0);
    expect(v.ok).toBe(true);
  });
});
