// WebMCP tools (https://github.com/webmachinelearning/webmcp) for in-page agents; does nothing without navigator.modelContext.
(() => {
  const context = navigator.modelContext;
  if (!context) return;
  let data;
  const load = () => (data ??= fetch('/archetypes.json').then(response => response.json()));
  const text = value => ({ content: [{ type: 'text', text: JSON.stringify(value) }] });
  const haystack = entry => [entry.slug, ...entry.aliases, ...entry.intents, ...(entry.params || []), entry.note || ''].join(' ').toLowerCase();
  const tools = [
    {
      name: 'search_archetypes',
      description: 'Search napplet archetypes by name, intent URI or parameter name. Returns matching archetypes with napplet counts and intents.',
      inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Words to match, e.g. "editor" or "pubkey"' } }, required: ['query'] },
      execute: async input => {
        const terms = String(input.query || '').toLowerCase().split(/\s+/).filter(Boolean);
        const { archetypes } = await load();
        return text(archetypes.filter(entry => terms.every(term => haystack(entry).includes(term))).slice(0, 20));
      },
    },
    {
      name: 'get_archetype',
      description: 'Get one napplet archetype by its exact name: status, intents, aliases and implementations.',
      inputSchema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
      execute: async input => text((await load()).archetypes.find(entry => entry.slug === input.slug) || { error: 'unknown archetype' }),
    },
  ];
  try {
    if (context.registerTool) for (const tool of tools) context.registerTool(tool);
    else if (context.provideContext) context.provideContext({ tools });
  } catch { /* draft API; an incompatible browser simply gets no tools */ }
})();
