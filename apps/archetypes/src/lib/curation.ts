/** curation.yaml: editorial site data changed by pull request; never protocol, never published to relays. */

import { parse } from 'yaml';
import { DEFAULT_SIMILARITY, type SimilarityConfig } from './similarity';
import { SLUG } from './release';

export type ArchetypeStatus = 'observed' | 'diverse';
export type ClusterOutcome = 'coalesce' | 'distinct' | 'diverse';

export interface ArchetypeNote { status?: ArchetypeStatus; note?: string; reviewed?: string }
export interface ParamAlignment { same: string[]; note?: string }
export interface CuratedCluster {
  members: string[];
  outcome: ClusterOutcome;
  /** For `coalesce`: the name search and listings lead with. */
  preferred?: string;
  params: ParamAlignment[];
  note?: string;
  reviewed?: string;
}

export interface Curation {
  similarity: SimilarityConfig;
  archetypes: Record<string, ArchetypeNote>;
  clusters: CuratedCluster[];
}

export const EMPTY_CURATION: Curation = { similarity: DEFAULT_SIMILARITY, archetypes: {}, clusters: [] };

type Plain = Record<string, unknown>;
const isPlain = (value: unknown): value is Plain => typeof value === 'object' && value !== null && !Array.isArray(value);

function keys(value: Plain, allowed: string[], where: string) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`curation: unknown key ${where}.${key}`);
}

function text(value: unknown, where: string, max = 600): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' && !(value instanceof Date)) throw new Error(`curation: ${where} must be text`);
  const out = value instanceof Date ? value.toISOString().slice(0, 10) : value.trim();
  if (out.length > max) throw new Error(`curation: ${where} is longer than ${max} characters`);
  return out || undefined;
}

function slug(value: unknown, where: string): string {
  if (typeof value !== 'string' || !SLUG.test(value)) throw new Error(`curation: ${where} must be an archetype name like "note" or "text-editor"`);
  return value;
}

function similarity(raw: unknown): SimilarityConfig {
  if (raw === undefined || raw === null) return DEFAULT_SIMILARITY;
  if (!isPlain(raw)) throw new Error('curation: similarity must be a mapping');
  keys(raw, ['threshold', 'weights', 'descriptionOverlap', 'spellingRatio'], 'similarity');
  const out: SimilarityConfig = { ...DEFAULT_SIMILARITY, weights: { ...DEFAULT_SIMILARITY.weights } };
  const number = (value: unknown, where: string) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`curation: ${where} must be a non-negative number`);
    return value;
  };
  if (raw.threshold !== undefined) out.threshold = number(raw.threshold, 'similarity.threshold');
  if (raw.descriptionOverlap !== undefined) out.descriptionOverlap = number(raw.descriptionOverlap, 'similarity.descriptionOverlap');
  if (raw.spellingRatio !== undefined) out.spellingRatio = number(raw.spellingRatio, 'similarity.spellingRatio');
  if (raw.weights !== undefined) {
    if (!isPlain(raw.weights)) throw new Error('curation: similarity.weights must be a mapping');
    keys(raw.weights, Object.keys(DEFAULT_SIMILARITY.weights), 'similarity.weights');
    for (const [key, value] of Object.entries(raw.weights)) {
      out.weights[key as keyof SimilarityConfig['weights']] = number(value, `similarity.weights.${key}`);
    }
  }
  return out;
}

/**
 * Parse and validate curation YAML. Every section is optional.
 * @param source YAML text.
 * @returns Validated curation.
 * @example parseCuration(readFileSync('curation.yaml', 'utf8'))
 */
export function parseCuration(source: string): Curation {
  const raw = parse(source) ?? {};
  if (!isPlain(raw)) throw new Error('curation: the file must be a mapping');
  keys(raw, ['similarity', 'archetypes', 'clusters'], 'curation');
  const archetypes: Record<string, ArchetypeNote> = {};
  if (raw.archetypes !== undefined && raw.archetypes !== null) {
    if (!isPlain(raw.archetypes)) throw new Error('curation: archetypes must be a mapping of name → note');
    for (const [name, entry] of Object.entries(raw.archetypes)) {
      slug(name, `archetypes.${name}`);
      if (!isPlain(entry)) throw new Error(`curation: archetypes.${name} must be a mapping`);
      keys(entry, ['status', 'note', 'reviewed'], `archetypes.${name}`);
      if (entry.status !== undefined && entry.status !== 'observed' && entry.status !== 'diverse') throw new Error(`curation: archetypes.${name}.status must be observed or diverse`);
      archetypes[name] = {
        ...(entry.status ? { status: entry.status as ArchetypeStatus } : {}),
        ...(text(entry.note, `archetypes.${name}.note`) ? { note: text(entry.note, `archetypes.${name}.note`) } : {}),
        ...(text(entry.reviewed, `archetypes.${name}.reviewed`, 32) ? { reviewed: text(entry.reviewed, `archetypes.${name}.reviewed`, 32) } : {}),
      };
    }
  }
  const clusters: CuratedCluster[] = [];
  if (raw.clusters !== undefined && raw.clusters !== null) {
    if (!Array.isArray(raw.clusters)) throw new Error('curation: clusters must be a list');
    raw.clusters.forEach((entry, index) => {
      const where = `clusters[${index}]`;
      if (!isPlain(entry)) throw new Error(`curation: ${where} must be a mapping`);
      keys(entry, ['members', 'outcome', 'preferred', 'params', 'note', 'reviewed'], where);
      if (!Array.isArray(entry.members) || entry.members.length < 2) throw new Error(`curation: ${where}.members must list at least two archetypes`);
      const members = [...new Set(entry.members.map((member, i) => slug(member, `${where}.members[${i}]`)))].sort();
      if (members.length < 2) throw new Error(`curation: ${where}.members must list at least two different archetypes`);
      if (!['coalesce', 'distinct', 'diverse'].includes(String(entry.outcome))) throw new Error(`curation: ${where}.outcome must be coalesce, distinct or diverse`);
      const outcome = entry.outcome as ClusterOutcome;
      let preferred: string | undefined;
      if (entry.preferred !== undefined) {
        preferred = slug(entry.preferred, `${where}.preferred`);
        if (!members.includes(preferred)) throw new Error(`curation: ${where}.preferred must be one of the members`);
      }
      if (outcome === 'coalesce' && !preferred) throw new Error(`curation: ${where} coalesces, so it needs a preferred name`);
      const params: ParamAlignment[] = [];
      if (entry.params !== undefined && entry.params !== null) {
        if (!Array.isArray(entry.params)) throw new Error(`curation: ${where}.params must be a list`);
        entry.params.forEach((param, i) => {
          const pw = `${where}.params[${i}]`;
          if (!isPlain(param)) throw new Error(`curation: ${pw} must be a mapping`);
          keys(param, ['same', 'note'], pw);
          if (!Array.isArray(param.same) || param.same.length < 2 || param.same.some(name => typeof name !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(name))) {
            throw new Error(`curation: ${pw}.same must list at least two parameter names`);
          }
          const note = text(param.note, `${pw}.note`);
          params.push({ same: param.same as string[], ...(note ? { note } : {}) });
        });
      }
      const note = text(entry.note, `${where}.note`);
      const reviewed = text(entry.reviewed, `${where}.reviewed`, 32);
      clusters.push({ members, outcome, ...(preferred ? { preferred } : {}), params, ...(note ? { note } : {}), ...(reviewed ? { reviewed } : {}) });
    });
  }
  const seen = new Map<string, number>();
  clusters.forEach((cluster, index) => {
    if (cluster.outcome !== 'coalesce') return;
    for (const member of cluster.members) {
      if (seen.has(member)) throw new Error(`curation: ${member} is coalesced in both clusters[${seen.get(member)}] and clusters[${index}]`);
      seen.set(member, index);
    }
  });
  return { similarity: similarity(raw.similarity), archetypes, clusters };
}
