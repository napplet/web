// WebMCP (https://github.com/webmachinelearning/webmcp), as progressive enhancement:
// when the browser exposes `navigator.modelContext`, an in-page agent can search
// archetypes and read one without scraping the HTML. Nothing happens otherwise.

import { searchArchetypes, type SearchableArchetype } from '../lib/search';

interface ModelContextTool {
  name: string;
  description: string;
  inputSchema: object;
  execute: (input: Record<string, unknown>) => Promise<unknown>;
}
interface ModelContext { registerTool?: (tool: ModelContextTool) => unknown; provideContext?: (context: { tools: ModelContextTool[] }) => unknown }

let data: Promise<{ archetypes: SearchableArchetype[] }> | undefined;
const load = () => (data ??= fetch('/archetypes.json').then(response => response.json()));
const text = (value: unknown) => ({ content: [{ type: 'text', text: JSON.stringify(value) }] });

const tools: ModelContextTool[] = [
  {
    name: 'search_archetypes',
    description: 'Search napplet archetypes by name, intent URI or parameter name. Returns matching archetypes with napplet counts and intents.',
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Words to match, e.g. "editor" or "pubkey"' } }, required: ['query'] },
    execute: async input => text(searchArchetypes((await load()).archetypes, String(input.query ?? '')).slice(0, 20)),
  },
  {
    name: 'get_archetype',
    description: 'Get one napplet archetype by its exact name: status, intents, aliases and implementations.',
    inputSchema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
    execute: async input => text((await load()).archetypes.find((entry: SearchableArchetype) => entry.slug === input.slug) ?? { error: 'unknown archetype' }),
  },
];

const context = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
try {
  if (context?.registerTool) for (const tool of tools) context.registerTool(tool);
  else if (context?.provideContext) context.provideContext({ tools });
} catch { /* the API is a draft; an incompatible browser simply gets no tools */ }
