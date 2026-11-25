import type { APIRoute } from 'astro';
import { loadSiteData } from '../../lib/data';
import { archetypeMarkdown } from '../../lib/agents';
import type { ArchetypeEntry } from '../../lib/model';

export function getStaticPaths() {
  return loadSiteData().index.archetypes.map(entry => ({ params: { slug: entry.slug }, props: { entry } }));
}

export const GET: APIRoute = ({ props }) => {
  const { index, snapshot } = loadSiteData();
  return new Response(archetypeMarkdown(props.entry as ArchetypeEntry, index, snapshot.siteUrl), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
