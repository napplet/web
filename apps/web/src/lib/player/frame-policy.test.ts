import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FRAME_POLICY, hasFramePolicy } from './frame-policy';

/** A head with the given CSP meta elements; the selector itself is exercised in the browser checks. */
function page(head: string) {
  const metas = [...head.matchAll(/<meta http-equiv="content-security-policy" content="([^"]*)">/gi)].map(match => ({ content: match[1] }));
  return { querySelectorAll: () => metas } as unknown as Pick<Document, 'querySelectorAll'>;
}

describe('player frame policy', () => {
  it('detects the frame-src lock and rejects pages without it', () => {
    expect(hasFramePolicy(page(`<meta http-equiv="Content-Security-Policy" content="${FRAME_POLICY}">`))).toBe(true);
    expect(hasFramePolicy(page(`<meta http-equiv="content-security-policy" content="img-src 'self'; ${FRAME_POLICY}">`))).toBe(true);
    expect(hasFramePolicy(page(''))).toBe(false);
    expect(hasFramePolicy(page(`<meta http-equiv="Content-Security-Policy" content="frame-src 'self'">`))).toBe(false);
    expect(hasFramePolicy(page(`<meta name="Content-Security-Policy" content="${FRAME_POLICY}">`))).toBe(false);
  });

  it('is set in the site layout head, where meta CSP is honoured', () => {
    const layout = readFileSync(new URL('../../layouts/SiteLayout.astro', import.meta.url), 'utf8');
    const head = layout.slice(layout.indexOf('<head>'), layout.indexOf('</head>'));
    expect(head).toContain('<meta http-equiv="Content-Security-Policy" content={FRAME_POLICY} />');
    expect(layout).toContain("import { FRAME_POLICY } from '../lib/player/frame-policy';");
  });
});
