import type { APIRoute } from 'astro';
import { loadSiteData } from '../lib/data';

export const GET: APIRoute = () => {
  const { snapshot } = loadSiteData();
  const body = {
    about: 'Relays the archetypes.napplet.run crawler found napplet manifests on, scored by how many napplets each serves. `live` lists the relays browsers ask for manifests newer than the build.',
    generatedAt: new Date(snapshot.generatedAt * 1000).toISOString(),
    live: snapshot.runtime.relays,
    stats: snapshot.stats,
    relays: snapshot.relays,
  };
  return new Response(JSON.stringify(body, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
