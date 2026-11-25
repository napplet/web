import type { APIRoute } from 'astro';
import { loadSiteData } from '../lib/data';
import { archetypesJson } from '../lib/agents';

export const GET: APIRoute = () => {
  const { index, snapshot } = loadSiteData();
  return new Response(JSON.stringify(archetypesJson(index, snapshot), null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
