import type { APIRoute } from 'astro';
import { loadSiteData } from '../lib/data';

// Search and AI agents are welcome: the point of the site is to be read by both.
const AGENTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'Google-Extended', 'PerplexityBot', 'Perplexity-User', 'CCBot', 'Applebot-Extended'];

export const GET: APIRoute = () => {
  const { snapshot } = loadSiteData();
  const body = [
    'User-agent: *',
    'Allow: /',
    '# Content Signals (https://contentsignals.org/): search and agent input yes, model training no.',
    'Content-Signal: search=yes, ai-input=yes, ai-train=no',
    '',
    ...AGENTS.flatMap(agent => [`User-agent: ${agent}`, 'Allow: /', '']),
    `Sitemap: ${snapshot.siteUrl}/sitemap-index.xml`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
