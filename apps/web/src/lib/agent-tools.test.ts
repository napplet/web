import { describe, expect, it, vi } from 'vitest';
import { agentTools, filterPages, htmlPath, markdownPath, MAX_PAGE_CHARS, parseLlmsTxt, registerAgentTools, sameOriginUrl, searchApps, type ModelContextTool, type ToolEnvironment } from './agent-tools';
import type { AgentApp } from './agent-catalog';

const ORIGIN = 'https://napplet.run';

const LLMS = `# napplet

> Apps that travel.

## Site

- [napplet — Apps that travel.](https://napplet.run/index.md): Build a web app.
- [App store — napplet](https://napplet.run/apps/index.md): Find your next small obsession.
- [Elsewhere](https://example.com/index.md): Not this site.

## Docs: Getting Started

- [Getting started](https://napplet.run/docs/guide/getting-started.md): This page walks you from zero to a deployable napplet.
- [Core concepts](https://napplet.run/docs/guide/concepts.md): Ideas that recur; getting started needs them.
`;

const APPS: AgentApp[] = [
  { name: 'Freeze Frame Response', description: 'Freeze the blast.', collection: 'curated', topics: ['Physics puzzle'], url: 'https://napplet.soy/n/naddr1a' },
  { name: 'Chess', description: 'Play a game.', collection: 'discovered', topics: ['game'], url: 'https://njump.me/naddr1b', requires: ['relay'], optional: [], author: 'ab', authorName: 'Grandmaster' },
];

function environment(files: Record<string, string>) {
  const navigate = vi.fn();
  const fetch = vi.fn(async (url: string) => {
    const body = files[new URL(url).pathname];
    return { ok: body !== undefined, status: body === undefined ? 404 : 200, text: async () => body ?? '', json: async () => JSON.parse(body ?? 'null') };
  });
  return { env: { origin: ORIGIN, fetch, navigate } as unknown as ToolEnvironment, fetch, navigate };
}

const tool = (env: ToolEnvironment, name: string) => agentTools(env).find(candidate => candidate.name === name)!;

describe('page paths', () => {
  it('maps pages to their Markdown copies the way SiteLayout and the docs build do', () => {
    expect(markdownPath('/')).toBe('/index.md');
    expect(markdownPath('/explainer/')).toBe('/explainer/index.md');
    expect(markdownPath('/apps')).toBe('/apps/index.md');
    expect(markdownPath('/docs/guide/concepts.html')).toBe('/docs/guide/concepts.md');
    expect(markdownPath('/docs/guide/concepts')).toBe('/docs/guide/concepts.md');
    expect(markdownPath('/protocol/index.md')).toBe('/protocol/index.md');
  });

  it('maps copies back to the page a person sees', () => {
    expect(htmlPath('/index.md')).toBe('/');
    expect(htmlPath('/explainer/index.md')).toBe('/explainer/');
    expect(htmlPath('/docs/guide/concepts.md')).toBe('/docs/guide/concepts.html');
  });

  it('accepts only references on this origin', () => {
    expect(sameOriginUrl('/apps/', ORIGIN)?.href).toBe('https://napplet.run/apps/');
    expect(sameOriginUrl('explainer/', ORIGIN)?.href).toBe('https://napplet.run/explainer/');
    expect(sameOriginUrl('https://napplet.run/protocol/', ORIGIN)?.pathname).toBe('/protocol/');
    for (const bad of ['https://example.com/', '//example.com/x', 'javascript:alert(1)', '', 42, undefined]) expect(sameOriginUrl(bad, ORIGIN)).toBeNull();
  });
});

describe('llms.txt', () => {
  it('reads every same-origin entry with its section', () => {
    const pages = parseLlmsTxt(LLMS, ORIGIN);
    expect(pages.map(page => page.title)).toEqual(['napplet — Apps that travel.', 'App store — napplet', 'Getting started', 'Core concepts']);
    expect(pages[1]).toEqual({ title: 'App store — napplet', section: 'Site', description: 'Find your next small obsession.', url: 'https://napplet.run/apps/', markdownUrl: 'https://napplet.run/apps/index.md' });
    expect(pages[2].url).toBe('https://napplet.run/docs/guide/getting-started.html');
  });

  it('filters by every word and puts title matches first', () => {
    const pages = filterPages(parseLlmsTxt(LLMS, ORIGIN), 'Getting STARTED');
    expect(pages.map(page => page.title)).toEqual(['Getting started', 'Core concepts']);
    expect(filterPages(parseLlmsTxt(LLMS, ORIGIN), '')).toHaveLength(4);
  });
});

describe('searchApps', () => {
  it('matches names, descriptions, topics and author names within a collection', () => {
    expect(searchApps(APPS, 'puzzle', 'all').map(app => app.name)).toEqual(['Freeze Frame Response']);
    expect(searchApps(APPS, 'grandmaster', 'all').map(app => app.name)).toEqual(['Chess']);
    expect(searchApps(APPS, undefined, 'discovered').map(app => app.name)).toEqual(['Chess']);
    expect(searchApps(APPS, 'play game', undefined)).toHaveLength(1);
  });
});

describe('agentTools', () => {
  it('gives every tool a valid WebMCP name, a description and an object input schema', () => {
    for (const candidate of agentTools(environment({}).env)) {
      expect(candidate.name).toMatch(/^[A-Za-z0-9_.-]{1,128}$/);
      expect(candidate.description.length).toBeGreaterThan(0);
      expect(candidate.inputSchema).toMatchObject({ type: 'object' });
    }
  });

  it('marks every tool except open_page read-only, and search results as untrusted', () => {
    const tools = agentTools(environment({}).env);
    expect(tools.filter(candidate => !candidate.annotations?.readOnlyHint).map(candidate => candidate.name)).toEqual(['open_page']);
    expect(tools.find(candidate => candidate.name === 'search_napplets')!.annotations?.untrustedContentHint).toBe(true);
  });

  it('list_pages filters the llms.txt index', async () => {
    const { env } = environment({ '/llms.txt': LLMS });
    const result = await tool(env, 'list_pages').execute({ query: 'store' }) as { total: number; pages: { url: string }[] };
    expect(result.total).toBe(1);
    expect(result.pages[0].url).toBe('https://napplet.run/apps/');
  });

  it('read_page returns the Markdown copy and refuses other origins', async () => {
    const { env, fetch } = environment({ '/docs/guide/concepts.md': '# Core concepts' });
    await expect(tool(env, 'read_page').execute({ path: '/docs/guide/concepts.html' })).resolves.toEqual({ url: 'https://napplet.run/docs/guide/concepts.html', markdownUrl: 'https://napplet.run/docs/guide/concepts.md', truncated: false, markdown: '# Core concepts' });
    await expect(tool(env, 'read_page').execute({ path: 'https://example.com/' })).rejects.toThrow('page on this site');
    await expect(tool(env, 'read_page').execute({ path: '/missing/' })).rejects.toThrow('HTTP 404');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('read_page cuts very long pages and says so', async () => {
    const { env } = environment({ '/index.md': 'x'.repeat(MAX_PAGE_CHARS + 5) });
    const result = await tool(env, 'read_page').execute({ path: '/' }) as { truncated: boolean; markdown: string };
    expect(result.truncated).toBe(true);
    expect(result.markdown).toHaveLength(MAX_PAGE_CHARS);
  });

  it('search_napplets loads the catalog once and applies the limit', async () => {
    const { env, fetch } = environment({ '/apps/catalog.json': JSON.stringify({ checkedAt: '2026-11-01T13:39:02.951Z', apps: APPS }) });
    const tools = agentTools(env);
    const search = tools.find(candidate => candidate.name === 'search_napplets')!;
    await expect(search.execute({ limit: 1 })).resolves.toEqual({ snapshotCheckedAt: '2026-11-01T13:39:02.951Z', total: 2, apps: [APPS[0]] });
    await search.execute({ query: 'chess' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('list_agent_skills resolves skill URLs against the site', async () => {
    const { env } = environment({ '/.well-known/agent-skills/index.json': JSON.stringify({ skills: [{ name: 'napplet-build', description: 'Build', url: '/.well-known/agent-skills/napplet-build/SKILL.md', digest: 'sha256:00' }] }) });
    await expect(tool(env, 'list_agent_skills').execute({})).resolves.toEqual({ skills: [{ name: 'napplet-build', description: 'Build', url: 'https://napplet.run/.well-known/agent-skills/napplet-build/SKILL.md', digest: 'sha256:00' }] });
  });

  it('open_page navigates only within the site', async () => {
    const { env, navigate } = environment({});
    await expect(tool(env, 'open_page').execute({ path: '/explainer/index.md' })).resolves.toEqual({ opened: 'https://napplet.run/explainer/' });
    expect(navigate).toHaveBeenCalledWith('https://napplet.run/explainer/');
    await expect(tool(env, 'open_page').execute({ path: 'https://example.com/' })).rejects.toThrow('page on this site');
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});

describe('registerAgentTools', () => {
  it('registers every tool with one abort signal', () => {
    const registered: [ModelContextTool, { signal?: AbortSignal } | undefined][] = [];
    const controller = registerAgentTools({ registerTool: async (candidate, options) => { registered.push([candidate, options]); } }, environment({}).env);
    expect(registered.map(([candidate]) => candidate.name)).toEqual(['list_pages', 'read_page', 'search_napplets', 'list_agent_skills', 'open_page']);
    expect(registered.every(([, options]) => options?.signal === controller!.signal)).toBe(true);
  });

  it('keeps going when one registration rejects or throws', () => {
    const names: string[] = [];
    registerAgentTools({ registerTool: (candidate) => { names.push(candidate.name); if (candidate.name === 'read_page') throw new Error('duplicate'); return Promise.reject(new Error('duplicate')); } }, environment({}).env);
    expect(names).toHaveLength(5);
  });

  it('does nothing without WebMCP', () => {
    expect(registerAgentTools(null, environment({}).env)).toBeNull();
  });
});
