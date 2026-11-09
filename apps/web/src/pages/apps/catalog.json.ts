import type { APIRoute } from 'astro';
import { buildAgentCatalog } from '../../lib/agent-catalog';

/** `/apps/catalog.json`: the app store's build snapshot as JSON, for agents and the `search_napplets` WebMCP tool. */
export const GET: APIRoute = () => new Response(JSON.stringify(buildAgentCatalog()), { headers: { 'Content-Type': 'application/json' } });
