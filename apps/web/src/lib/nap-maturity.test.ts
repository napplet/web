import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NAP_IMPLEMENTATIONS } from '../../../../packages/core/src/nap-catalog';
import { napMaturityTable, renderNapMaturityMarkdown } from '../../../../scripts/lib/nap-maturity-docs';

const docs = new URL('../../../docs/', import.meta.url);

describe('catalog-driven documentation', () => {
  it('renders every shipped domain with distinct maturity, proposal status and rationale', () => {
    const table = napMaturityTable();
    for (const [domain, entry] of Object.entries(NAP_IMPLEMENTATIONS)) {
      expect(table).toContain(`| \`${domain}\` | ${entry.maturity} | [${entry.proposal.status}](${entry.proposal.url}) | ${entry.rationale} |`);
    }
  });

  it('labels authored domain pages from the same catalog before rendering examples', () => {
    for (const domain of ['gamepad', 'llm']) {
      const source = readFileSync(new URL(`naps/${domain}.md`, docs), 'utf8');
      const rendered = renderNapMaturityMarkdown(source, `naps/${domain}.md`);
      const metadata = NAP_IMPLEMENTATIONS[domain as keyof typeof NAP_IMPLEMENTATIONS];
      expect(rendered).toContain(`**Implementation: ${metadata.maturity} · Proposal:`);
      expect(rendered).toContain(metadata.proposal.url);
      expect(rendered).toContain(metadata.proposal.checkedAt);
      expect(rendered.indexOf('**Implementation:')).toBeLessThan(rendered.indexOf('```'));
    }
  });

  it('keeps the overview synchronized and does not modify unrelated documentation', () => {
    const source = readFileSync(new URL('naps/index.md', docs), 'utf8');
    const rendered = renderNapMaturityMarkdown(source, 'naps/index.md');
    expect(rendered).toContain(napMaturityTable());
    expect(rendered).not.toContain('<!-- nap-maturity');
    for (const heading of source.matchAll(/^### ([a-z]+)\n/gm)) {
      expect(rendered).toContain(`${heading[0]}\n> **Implementation:`);
    }
    expect(renderNapMaturityMarkdown('# Other\n', 'guide/index.md')).toBe('# Other\n');
  });
});
