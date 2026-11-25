import type { APIRoute } from 'astro';
import { loadSiteData } from '../lib/data';
import { llmsFullTxt } from '../lib/agents';

export const GET: APIRoute = () => {
  const { index, snapshot } = loadSiteData();
  return new Response(llmsFullTxt(index, snapshot.siteUrl), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
