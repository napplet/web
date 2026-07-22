import type { NappletConfig } from "./types.ts";

const NAP_DOMAINS = new Set([
  "relay",
  "identity",
  "storage",
  "inc",
  "theme",
  "keys",
  "media",
  "notify",
  "config",
  "resource",
  "cvm",
  "outbox",
  "upload",
  "intent",
  "ble",
  "webrtc",
  "link",
  "lists",
  "serial",
  "common",
  "dm",
]);

export async function readManifestMetadataTags(
  indexHtmlPath: string | undefined,
  manifestPath: string | undefined,
  config: NappletConfig,
): Promise<string[][]> {
  return mergeConfigMetadataTags(
    dedupeTags([
      ...await readIndexHtmlMetadataTags(indexHtmlPath),
      ...await readPluginManifestMetadataTags(manifestPath),
    ]),
    config,
  );
}

async function readPluginManifestMetadataTags(
  manifestPath: string | undefined,
): Promise<string[][]> {
  if (!manifestPath) return [];
  try {
    const raw = await Deno.readTextFile(manifestPath);
    const value = JSON.parse(raw) as { tags?: unknown };
    if (!Array.isArray(value.tags)) return [];
    const tags: string[][] = [];
    for (const tag of value.tags) {
      if (!Array.isArray(tag) || typeof tag[0] !== "string") continue;
      if (tag[0] === "requires" && typeof tag[1] === "string") {
        const domain = tag[1].trim();
        if (NAP_DOMAINS.has(domain)) tags.push(["requires", domain]);
      }
      if (isCanonicalArchetypeTag(tag)) {
        tags.push(tag.map((value) => String(value).trim()));
      }
    }
    return dedupeTags(tags);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound || error instanceof SyntaxError) return [];
    throw error;
  }
}

function mergeConfigMetadataTags(tags: readonly string[][], config: NappletConfig): string[][] {
  const metadata = config.metadata;
  if (!metadata) return dedupeTags(tags);
  const replaced = new Set<string>();
  if (metadata.title) replaced.add("title");
  if (metadata.description) replaced.add("description");
  if (metadata.archetypes !== undefined) replaced.add("archetype");
  const result = tags.filter((tag) => !replaced.has(tag[0]));
  if (metadata.title) result.push(["title", metadata.title]);
  if (metadata.description) result.push(["description", metadata.description]);
  for (const contract of metadata.archetypes ?? []) {
    result.push([
      "archetype",
      contract.slug,
      contract.protocol,
      ...(contract.eventKinds ?? []).map((kind) => `kind:${kind}`),
    ]);
  }
  return dedupeTags(result);
}

function isCanonicalArchetypeTag(tag: unknown[]): tag is string[] {
  if (
    tag[0] !== "archetype" || typeof tag[1] !== "string" ||
    typeof tag[2] !== "string"
  ) return false;
  const slug = tag[1].trim();
  const protocol = tag[2].trim();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug) || !/^NAP-[1-9][0-9]*$/.test(protocol)) {
    return false;
  }
  return tag.slice(3).every((value) =>
    typeof value === "string" && /^kind:(0|[1-9][0-9]*)$/.test(value.trim())
  );
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
    const key = tag.join("\0");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push([...tag]);
  }
  return result;
}
