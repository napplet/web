import type { APIRoute } from 'astro';
import { loadSiteData } from '../../../../lib/data';
import { intentMarkdown } from '../../../../lib/agents';
import type { IntentEntry } from '../../../../lib/model';

export function getStaticPaths() {
  return loadSiteData().index.intents.map(intent => ({ params: { archetype: intent.archetype, verb: intent.verb }, props: { intent } }));
}

export const GET: APIRoute = ({ props }) => new Response(intentMarkdown(props.intent as IntentEntry, loadSiteData().snapshot.siteUrl), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
