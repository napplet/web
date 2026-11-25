import type { APIRoute } from 'astro';
import { loadSiteData } from '../../../../lib/data';
import { skillMarkdown } from '../../../../lib/agents';

export const GET: APIRoute = () => {
  const { index, snapshot } = loadSiteData();
  return new Response(skillMarkdown(index, snapshot.siteUrl), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
