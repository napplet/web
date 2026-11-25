import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';
import { loadSiteData } from '../../../lib/data';
import { skillMarkdown } from '../../../lib/agents';

export const GET: APIRoute = () => {
  const { index, snapshot } = loadSiteData();
  const skill = skillMarkdown(index, snapshot.siteUrl);
  const body = {
    $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
    skills: [{
      name: 'napplet-archetypes',
      type: 'skill-md',
      description: 'Use when choosing the z (archetype) and i (intent) tags for a napplet manifest, or finding napplets that accept an intent: reuse names other napplets already publish.',
      url: '/.well-known/agent-skills/napplet-archetypes/SKILL.md',
      digest: `sha256:${createHash('sha256').update(skill).digest('hex')}`,
    }],
  };
  return new Response(JSON.stringify(body, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
