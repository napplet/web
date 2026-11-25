import type { APIRoute } from 'astro';
import { loadSiteData } from '../../../lib/data';
import { clusterMarkdown } from '../../../lib/agents';
import type { ClusterEntry } from '../../../lib/model';

export function getStaticPaths() {
  return loadSiteData().index.clusters.map(cluster => ({ params: { id: cluster.id }, props: { cluster } }));
}

export const GET: APIRoute = ({ props }) => new Response(clusterMarkdown(props.cluster as ClusterEntry, loadSiteData().snapshot.siteUrl), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
