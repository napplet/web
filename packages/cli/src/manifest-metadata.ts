import { dirname } from "./path.ts";
import { inferRepositorySource, normalizeSourceOverride } from "./repository-source.ts";
import { readHtmlPublishingFile } from "./html-metadata.ts";
import type { ManifestFormat } from "./manifest-format.ts";
import type { NappletConfig } from "./types.ts";

export async function readManifestMetadataTags(
  indexHtmlPath: string | undefined,
  manifestPath: string | undefined,
  config: Pick<NappletConfig, "metadata">,
  format: ManifestFormat = "current",
): Promise<string[][]> {
  const html = (await readHtmlPublishingFile(indexHtmlPath)).tags;
  const htmlTags = format === "legacy"
    ? html.filter((t) => ["title", "description"].includes(t[0])).map((t) => [t[0], t[1].trim()])
    : html;
  const tags = preferOptionalDomains(mergeConfigMetadataTags(
    overlayTags(
      htmlTags,
      await readPluginManifestMetadataTags(manifestPath, format),
    ),
    config,
    format,
  ));
  if (format === "current" && indexHtmlPath && config.metadata?.source !== false && !tags.some((tag) => tag[0] === "source")) {
    const source = await inferRepositorySource(dirname(indexHtmlPath));
    if (source) tags.push(["source", source]);
  }
  return tags;
}

/**
 * Drop `R` tags for domains that also appear in an `O` tag, mirroring @napplet/vite-plugin
 * `buildManifestTemplate` (required filtered by optional). NIP-5D's tag table does not make
 * R/O overlap an error, so this is tooling consistency only, not a validator rule.
 */
function preferOptionalDomains(tags: readonly string[][]): string[][] {
  const optional = new Set(tags.filter((tag) => tag[0] === "O").map((tag) => tag[1]));
  return tags.filter((tag) => !(tag[0] === "R" && optional.has(tag[1]))).map((tag) => [...tag]);
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
      if (tag[0] === "requires") {
        // Legacy sidecars may include whitespace or empty requirements. Keep all
        // non-empty declarations without restricting them to this CLI's registry.
        const domain = tag[1]?.trim();
        if (domain) tags.push(["R", domain]);
      } else if (isCanonicalArchetypeTag(tag)) {
        if (format === "legacy") tags.push([...tag]);
        else tags.push(["z", tag[1]], ["i", tag[2]]);
      } else if (
        ["R", "O", "z", "i", "icon", "title", "source", "config", "d", "server", "a", "A"].includes(
          tag[0],
        )
      ) {
        if (format === "current" || !["d", "server", "a", "A"].includes(tag[0])) {
          tags.push([...tag]);
        }
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
  config: Pick<NappletConfig, "metadata">,
  format: ManifestFormat,
): string[][] {
  const metadata = config.metadata;
  if (!metadata) return dedupeTags(tags);
  const source = normalizeSourceOverride(metadata.source);
  const replaced = new Set<string>();
  if (source !== undefined) replaced.add("source");
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
  if (source) result.push(["source", source]);
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

function overlayTags(html: string[][], sidecar: string[][]): string[][] {
  const replaced = new Set(sidecar.map((tag) => tag[0]));
  return dedupeTags([...html.filter((tag) => !replaced.has(tag[0])), ...sidecar]);
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
    !["title", "description", "source", "config", "d", "icon", "a", "A"].includes(tag[0]) ||
    result.findLastIndex((other) => other[0] === tag[0]) === index
  );
}
