import type { APIRoute } from 'astro';
import { loadSiteData } from '../lib/data';
import { indexMarkdown } from '../lib/agents';

export const GET: APIRoute = () => {
  const { index, snapshot } = loadSiteData();
  return new Response(indexMarkdown(index, snapshot.siteUrl), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
