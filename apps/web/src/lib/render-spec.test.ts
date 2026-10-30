import { describe, expect, it } from 'vitest';
import { renderSpec } from './render-spec';

const source = 'https://github.com/contributor/naps/blob/abc123/naps/NAP-BLOSSOM.md';

describe('upstream specification rendering', () => {
  it('preserves headings, API tables, wire examples and the final section', () => {
    const { html, headings } = renderSpec(`NAP-BLOSSOM
===========
## API Surface
| Operation | Parameters |
| --- | --- |
| \`getServers\` | — |
## Wire Protocol
\`\`\`json
{"type":"blossom.getServers"}
\`\`\`
## Security Considerations
**Preserve this final paragraph.**
`, source);
    expect(html).toContain('<h2 id="spec-nap-blossom">NAP-BLOSSOM</h2>');
    expect(html).toContain('<table>');
    expect(html).toContain('<td><code>getServers</code></td>');
    expect(html).toContain('{"type":"blossom.getServers"}');
    expect(html).toContain('<strong>Preserve this final paragraph.</strong>');
    expect(headings.at(-1)?.id).toBe('spec-security-considerations');
  });

  it('resolves relative references at the fetched fork revision and links duplicate headings', () => {
    const { html, headings } = renderSpec('## A &amp; B\n## A & B\n[section](#a--b-1)\n[other](../README.md#registry)\n![diagram](./diagram.png)', source);
    expect(headings.map(heading => heading.id)).toEqual(['spec-a--b', 'spec-a--b-1']);
    expect(html).toContain('href="#spec-a--b-1"');
    expect(html).toContain('href="https://github.com/contributor/naps/blob/abc123/README.md#registry"');
    expect(html).toContain('src="https://raw.githubusercontent.com/contributor/naps/abc123/naps/diagram.png"');
  });

  it('removes active HTML and dangerous URLs without stripping literal code examples', () => {
    const { html } = renderSpec(`<script>alert(1)</script>
<iframe src="https://example.com"></iframe>
<img src="javascript:alert(1)" onerror="alert(2)">
<a href="javascript:alert(3)">unsafe</a>
<details id="main"><summary>Details</summary>Kept</details>
<input type="password" autofocus>

\`\`\`html
<script>example()</script>
\`\`\``, source);
    expect(html).not.toMatch(/<script|<iframe|onerror|javascript:|type="password"|autofocus/);
    expect(html).toContain('&lt;script&gt;example()&lt;/script&gt;');
    expect(html).toContain('<details id="spec-main">');
    expect(html).toContain('type="checkbox" disabled');
  });
});
