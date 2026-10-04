import type { ManifestFormat } from "./manifest-format.ts";
import type { NappletConfig } from "./types.ts";

export async function readManifestMetadataTags(
  indexHtmlPath: string | undefined,
  manifestPath: string | undefined,
  config: NappletConfig,
  format: ManifestFormat = "current",
): Promise<string[][]> {
  return mergeConfigMetadataTags(
    dedupeTags([
      ...await readIndexHtmlMetadataTags(indexHtmlPath),
      ...await readPluginManifestMetadataTags(manifestPath, format),
    ]),
    config,
    format,
  );
}

async function readPluginManifestMetadataTags(
  manifestPath: string | undefined,
  format: ManifestFormat,
): Promise<string[][]> {
  if (!manifestPath) return [];
  try {
    const raw = await Deno.readTextFile(manifestPath);
    const value = JSON.parse(raw) as { tags?: unknown; content?: unknown };
    if (!Array.isArray(value.tags)) return [];
    const tags: string[][] = [];
    if (typeof value.content === "string" && value.content.trim()) {
      tags.push(["description", value.content]);
    }
    for (const tag of value.tags) {
      if (!Array.isArray(tag) || typeof tag[0] !== "string") continue;
      if (!tag.every((part) => typeof part === "string")) continue;
      if (tag[0] === "requires") tags.push(["R", tag[1]]);
      else if (isCanonicalArchetypeTag(tag)) {
        if (format === "legacy") tags.push([...tag]);
        else tags.push(["z", tag[1]], ["i", tag[2]]);
      } else if (["R", "O", "z", "i", "icon", "title", "source", "config"].includes(tag[0])) {
        tags.push([...tag]);
      } else if (tag[0] === "description" && !value.content) tags.push([...tag]);
    }
    return dedupeTags(tags);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound || error instanceof SyntaxError) return [];
    throw error;
  }
}

function mergeConfigMetadataTags(
  tags: readonly string[][],
  config: NappletConfig,
  format: ManifestFormat,
): string[][] {
  const metadata = config.metadata;
  if (!metadata) return dedupeTags(tags);
  const replaced = new Set<string>();
  if (metadata.title) replaced.add("title");
  if (metadata.description) replaced.add("description");
  if (metadata.archetypes !== undefined) {
    replaced.add("z");
    replaced.add("i");
    replaced.add("archetype");
  }
  if (metadata.requires !== undefined) replaced.add("R");
  if (metadata.optional !== undefined) replaced.add("O");
  const result = tags.filter((tag) => !replaced.has(tag[0]));
  if (metadata.title) result.push(["title", metadata.title]);
  if (metadata.description) result.push(["description", metadata.description]);
  for (const convention of metadata.archetypes ?? []) {
    if (format === "legacy") result.push(["archetype", convention.slug, convention.convention]);
    else {result.push(["z", convention.slug], [
        "i",
        convention.convention,
        ...(convention.params ?? []),
      ]);}
  }
  for (const domain of metadata.requires ?? []) result.push(["R", domain]);
  for (const domain of metadata.optional ?? []) result.push(["O", domain]);
  return dedupeTags(result);
}

function isCanonicalArchetypeTag(tag: unknown[]): tag is string[] {
  if (
    tag[0] !== "archetype" || typeof tag[1] !== "string" ||
    typeof tag[2] !== "string"
  ) return false;
  const slug = tag[1].trim();
  const convention = tag[2].trim();
  const conventionMatch = /^napplet:([^/?#\s]+)\/([^/?#\s]+)$/.exec(convention);
  if (
    !/^[a-z0-9][a-z0-9-]*$/.test(slug) ||
    !conventionMatch
  ) return false;
  return tag.length === 3;
}

async function readIndexHtmlMetadataTags(indexHtmlPath: string | undefined): Promise<string[][]> {
  if (!indexHtmlPath) return [];
  let html: string;
  try {
    html = await Deno.readTextFile(indexHtmlPath);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return [];
    throw error;
  }
  const tags: string[][] = [];
  const title = extractHtmlTitle(html);
  if (title) tags.push(["title", title]);
  const description = extractHtmlDescription(html);
  if (description) tags.push(["description", description]);
  return tags;
}

function extractHtmlTitle(html: string): string | null {
  const match = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!match) return null;
  const value = decodeHtmlEntities(match[1]).trim();
  return value.length > 0 ? value : null;
}

function extractHtmlDescription(html: string): string | null {
  const metaRe = /<meta\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = metaRe.exec(html)) !== null) {
    const tag = match[0];
    const name = getHtmlTagAttr(tag, "name");
    if (name === null || name.toLowerCase() !== "description") continue;
    const content = getHtmlTagAttr(tag, "content");
    if (content === null) continue;
    const value = decodeHtmlEntities(content).trim();
    if (value.length > 0) return value;
  }
  return null;
}

function getHtmlTagAttr(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = re.exec(tag);
  return match ? (match[1] ?? match[2] ?? match[3] ?? "") : null;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function dedupeTags(tags: readonly string[][]): string[][] {
  const seen = new Set<string>();
  const result: string[][] = [];
  for (const tag of tags) {
    const key = JSON.stringify(tag);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push([...tag]);
  }
  return result.filter((tag, index) =>
    !["title", "description", "source", "config"].includes(tag[0]) ||
    result.findLastIndex((other) => other[0] === tag[0]) === index
  );
}
