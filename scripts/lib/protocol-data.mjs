/** Generated source documents and non-normative directory metadata from the living NAP repository. */
export const NAPS_REPOSITORY = 'https://github.com/napplet/naps';
const napPath = /(?:^|\/)(NAP-[A-Z0-9]+(?:-[A-Z0-9]+)*)\.md$/;

/** Return the NAP identifier for a spec path, excluding repository templates. */
export function napId(path) {
  const id = path.match(napPath)?.[1];
  return id && !id.endsWith('-TEMPLATE') ? id : null;
}

/** Reduce upstream Markdown to inert text; pages never execute upstream HTML. */
export function plainText(value) {
  return value.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<[^>]*>/g, '')
    .replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim();
}

/** Extract an ATX section without absorbing subsequent peer sections. */
export function section(markdown, heading) {
  const lines = markdown.split('\n');
  const start = lines.findIndex(line => line.toLowerCase().trim() === `## ${heading.toLowerCase()}`);
  if (start < 0) return '';
  const end = lines.findIndex((line, index) => index > start && /^#{1,2} /.test(line));
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n').trim();
}

/** Read registry maturity independently of merge state; tolerate column movement. */
export function parseRegistry(markdown) {
  const result = new Map();
  let headers = [];
  for (const line of markdown.split('\n').filter(line => line.trim().startsWith('|'))) {
    const cells = line.trim().slice(1, -1).split('|').map(cell => cell.trim());
    if (cells.some(cell => plainText(cell).toLowerCase() === 'nap id')) {
      headers = cells.map(cell => plainText(cell).toLowerCase());
      continue;
    }
    const id = cells[headers.indexOf('nap id')]?.match(/NAP-[A-Z0-9]+(?:-[A-Z0-9]+)*/)?.[0];
    if (!id) continue;
    const field = name => plainText(cells[headers.indexOf(name)] ?? '');
    result.set(id, { status: field('status'), domain: field('domain'), description: field('description') });
  }
  return result;
}

function headings(markdown) {
  const lines = markdown.split('\n');
  const result = [];
  let code = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) code = !code;
    if (code) continue;
    const atx = lines[i].match(/^#{1,3}\s+(.+?)\s*#*$/);
    const setext = i + 1 < lines.length && /^(?:={3,}|-{3,})\s*$/.test(lines[i + 1]);
    if (atx || (setext && lines[i].trim())) result.push(plainText(atx?.[1] ?? lines[i]));
  }
  return [...new Set(result)];
}

/** Extract orientation metadata, not a local copy of the normative contract. */
export function parseNap(markdown, path, registry) {
  const id = napId(path);
  if (!id) throw new Error(`Not a NAP specification: ${path}`);
  const listed = registry.get(id);
  const parent = [...registry.entries()].find(([name, entry]) => id.startsWith(`${name}-`) && /deferred/i.test(entry.status));
  const outline = headings(markdown);
  const title = outline.find(heading => !heading.startsWith('NAP-')) ?? id;
  const description = section(markdown, 'Description').split(/\n\s*\n/)[0];
  const preamble = markdown.split(/^## (?:Description|API Surface|Wire Protocol)\s*$/m)[0];
  const domain = preamble.match(/\*\*Domain:\*\*\s*`?([a-z][a-z0-9-]*)/i)?.[1] ?? listed?.domain ?? null;
  const declaredStatus = preamble.match(/^`(draft|experimental|active|stable|deprecated|deferred)`\s*$/mi)?.[1]?.toLowerCase() ?? null;
  const depends = preamble.match(/\*\*Depends:\*\*([^]*?)(?=\n\*\*[A-Z]|$)/)?.[1] ?? '';
  const dependencies = [...depends.matchAll(/^-\s+`([^`]+)`/gm)].map(match => match[1]);
  const operations = [];
  for (const line of section(markdown, 'API Surface').split('\n')) {
    const operation = line.match(/^\|\s*`([^`]+)`\s*\|/)?.[1];
    if (operation && !operations.includes(operation)) operations.push(operation);
    if (line.startsWith('### ')) break;
  }
  return {
    id, title, domain, description: plainText(description || listed?.description || title).slice(0, 900),
    declaredStatus, registryStatus: listed?.status ?? parent?.[1].status ?? null,
    statusSource: listed ? id : parent?.[0] ?? null,
    dependencies: [...new Set(dependencies)], operations,
    sections: outline.filter(heading => heading !== id && heading !== title).slice(0, 24),
  };
}

/** Combine a complete upstream read; closed PRs disappear and merged files stand alone. */
export function buildProtocolData(input) {
  const { branch, commit, readme, template, agents, merged, proposals, checkedAt } = input;
  const registry = parseRegistry(readme);
  if (registry.size === 0 || !section(readme, 'Boundary rule') || !section(readme, 'Governance')) {
    throw new Error('Upstream registry/governance format changed; review the protocol generator before publishing.');
  }
  const templateSections = headings(template).filter(heading => !heading.includes('{'));
  if (!templateSections.includes('Description') || !templateSections.includes('Security Considerations')) {
    throw new Error('Upstream NAP template changed; review contribution guidance before publishing.');
  }
  const url = path => `${NAPS_REPOSITORY}/blob/${encodeURIComponent(branch)}/${path}`;
  const entries = merged.map(file => ({
    ...parseNap(file.content, file.path, registry), slug: napId(file.path).toLowerCase(),
    state: 'merged', change: null, pr: null, path: file.path, revision: commit,
    sourceUrl: url(file.path), discussionUrl: null,
    documentUrl: `${NAPS_REPOSITORY}/blob/${commit}/${file.path}`, markdown: file.content,
  }));
  const mergedIds = new Set(entries.map(entry => entry.id));
  for (const proposal of proposals) {
    for (const file of proposal.files) {
      const meta = parseNap(file.content, file.path, registry);
      entries.push({
        ...meta, slug: `${meta.id.toLowerCase()}-pr-${proposal.number}`,
        state: proposal.draft ? 'draft' : 'open',
        change: file.status === 'removed' ? 'removal' : mergedIds.has(meta.id) ? 'amendment' : 'new',
        pr: proposal.number, prTitle: proposal.title, updatedAt: proposal.updatedAt,
        path: file.path, revision: proposal.revision,
        sourceUrl: `${NAPS_REPOSITORY}/pull/${proposal.number}/files`,
        discussionUrl: `${NAPS_REPOSITORY}/pull/${proposal.number}`,
        documentUrl: file.documentUrl ?? `${NAPS_REPOSITORY}/blob/${proposal.revision}/${file.path}`, markdown: file.content,
      });
    }
  }
  if (!entries.some(entry => entry.state === 'merged')) throw new Error('No merged NAPs found; refusing to publish an empty directory.');
  entries.sort((a, b) => a.id.localeCompare(b.id) || (a.pr ?? 0) - (b.pr ?? 0));
  if (new Set(entries.map(entry => entry.slug)).size !== entries.length) throw new Error('Duplicate NAP routes in upstream data.');
  return {
    schemaVersion: 2, checkedAt, repository: NAPS_REPOSITORY, branch, commit, entries,
    contribution: {
      readmeUrl: `${NAPS_REPOSITORY}#boundary-rule`, governanceUrl: `${NAPS_REPOSITORY}#governance`,
      templateUrl: url('NAP-WORD-TEMPLATE.md'), contributorUrl: url('AGENTS.md'),
      conventionUrl: url('CONVENTION-TEMPLATE.md'), archetypeUrl: url('naat/TEMPLATE.md'),
      projectionUrl: url('projections/web.md'), templateSections,
      // Short upstream excerpts keep the editorial guidance connected to current governance.
      boundary: plainText(section(readme, 'Boundary rule')),
      governance: section(readme, 'Governance').split(/\n\s*-/).map(plainText).filter(Boolean),
      prSections: [...section(agents, 'PR format — identical every time').matchAll(/## (Summary|Changes|Downstream)/g)].map(match => match[1]),
    },
  };
}
