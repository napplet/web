import type { APIRoute } from 'astro';
import { loadSiteData } from '../../lib/data';

// RFC 9727 API catalog: the site's read-only JSON and text endpoints.
export const GET: APIRoute = () => {
  const site = loadSiteData().snapshot.siteUrl;
  const body = {
    linkset: [{
      anchor: `${site}/.well-known/api-catalog`,
      item: [
        { href: `${site}/archetypes.json`, type: 'application/json', title: 'Archetypes, intents, parameters and clusters' },
        { href: `${site}/relays.json`, type: 'application/json', title: 'Relays used for live updates, with crawler scores' },
        { href: `${site}/llms.txt`, type: 'text/plain', title: 'llms.txt index' },
      ],
      'service-doc': [{ href: `${site}/agents/`, type: 'text/html' }],
    }],
  };
  return new Response(JSON.stringify(body, null, 2), { headers: { 'Content-Type': 'application/linkset+json' } });
};
