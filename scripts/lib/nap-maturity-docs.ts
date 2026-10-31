/** Build-time, non-normative documentation derived from the shipped implementation catalog. */
import { NAP_IMPLEMENTATIONS } from '../../packages/core/src/nap-catalog.js';
import { getNapImplementation } from '../../packages/core/src/nap-maturity.js';

/** Render the complete implementation overview, keeping upstream state separate. */
export function napMaturityTable(): string {
  const rows = Object.entries(NAP_IMPLEMENTATIONS).map(([domain, entry]) =>
    `| \`${domain}\` | ${entry.maturity ?? 'unclassified'} | [${entry.proposal.status}](${entry.proposal.url}) | ${entry.rationale} |`,
  );
  return [
    '| Domain | Implementation maturity | Proposal status | Assessment |',
    '| --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

/** Render a domain assessment with release-time status provenance. */
export function napMaturityNotice(domain: string): string {
  const entry = getNapImplementation(domain);
  if (!entry) return '';
  return `> **Implementation: ${entry.maturity ?? 'unclassified'} · Proposal: [${entry.proposal.status}](${entry.proposal.url})** (status checked ${entry.proposal.checkedAt}). ${entry.rationale} All capabilities remain subject to change. [Maturity and opt-in policy](/naps/maturity).\n`;
}

/**
 * Add catalog-driven labels before VitePress parses Markdown.
 * @param source Authored documentation Markdown.
 * @param relativePath Path relative to the documentation root.
 * @returns Markdown with generated notices and overview tables.
 * @example
 * ```ts
 * renderNapMaturityMarkdown('# LLM\n', 'naps/llm.md');
 * ```
 */
export function renderNapMaturityMarkdown(source: string, relativePath: string): string {
  if (!relativePath.startsWith('naps/')) return source;
  let rendered = source.replace('<!-- nap-maturity-table -->', napMaturityTable());
  rendered = rendered.replace(/<!-- nap-maturity:([a-z]+) -->/g, (_, domain: string) => napMaturityNotice(domain));
  if (relativePath === 'naps/index.md') {
    return rendered.replace(/^### ([a-z]+)\n/gm, (heading, domain: string) => `${heading}\n${napMaturityNotice(domain)}`);
  }
  const domain = relativePath.slice('naps/'.length).replace(/\.md$/, '');
  const notice = napMaturityNotice(domain);
  return notice ? rendered.replace(/^(# .+\n)/m, `$1\n${notice}`) : rendered;
}
