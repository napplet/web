import { dirname, resolvePath } from "./path.ts";
import { buildMediaTag, type MediaBlob } from "./manifest-media.ts";
import { inferRepositorySource, normalizeSourceOverride } from "./repository-source.ts";
import { readHtmlPublishingFile } from "./html-metadata.ts";
import type { ManifestFormat } from "./manifest-format.ts";
import type { NappletConfig } from "./types.ts";

export interface ManifestMetadata {
  tags: string[][];
  content: string;
  /** Bytes of configured screenshots and preview, uploaded alongside the artifact. */
  blobs: MediaBlob[];
}

/** Resolve publishing content separately from the event's extensible tag array.
 * @param indexHtmlPath Built artifact providing optional publishing hints.
 * @param manifestPath Optional signed or unsigned sidecar.
 * @param config Explicit publishing metadata overrides.
 * @param format Requested output format.
 * @returns Event tags and plain-text content with normal precedence applied.
 * @example await readManifestMetadata("dist/index.html", undefined, {})
 */
export async function readManifestMetadata(
  indexHtmlPath: string | undefined,
  manifestPath: string | undefined,
  config: Pick<NappletConfig, "metadata">,
  format: ManifestFormat = "current",
  options: { cwd?: string } = {},
): Promise<ManifestMetadata> {
  const html = (await readHtmlPublishingFile(indexHtmlPath)).tags;
  const description = html.find((tag) => tag[0] === "description")?.[1];
  const htmlContent = format === "legacy" ? description?.trim() : description;
  const htmlTags = html.filter((tag) => tag[0] !== "description" &&
    (format === "current" || tag[0] === "title"))
    .map((tag) => format === "legacy" ? [tag[0], tag[1].trim()] : tag);
  const sidecar = await readPluginManifestMetadata(manifestPath, format);
  const tags = preferOptionalDomains(mergeConfigMetadataTags(
    overlayTags(htmlTags, sidecar.tags), config, format,
  ));
  if (format === "current" && indexHtmlPath && config.metadata?.source !== false && !tags.some((tag) => tag[0] === "source")) {
    const source = await inferRepositorySource(dirname(indexHtmlPath));
    if (source) tags.push(["source", source]);
  }
  const blobs = format === "current" ? await mergeConfiguredMedia(tags, config, options.cwd ?? Deno.cwd()) : [];
  return { tags, content: config.metadata?.description ?? sidecar.content ?? htmlContent ?? "", blobs };
}

/**
 * Replace screenshot and preview tags with configured local media (NIP-5D §Presentation media).
 * Configured lists override sidecar categories; an empty list clears them.
 */
async function mergeConfiguredMedia(
  tags: string[][],
  config: Pick<NappletConfig, "metadata">,
  cwd: string,
): Promise<MediaBlob[]> {
  const blobs: MediaBlob[] = [];
  const { screenshots, preview } = config.metadata ?? {};
  if (screenshots !== undefined) {
    tags.splice(0, tags.length, ...tags.filter((tag) => tag[0] !== "screenshot"));
    for (const [index, entry] of screenshots.entries()) {
      const label = `metadata.screenshots[${index}]`;
      const data = await readMediaFile(resolvePath(cwd, entry.path), label);
      const { tag, blob } = await buildMediaTag("screenshot", data, { alt: entry.alt, label });
      tags.push(tag);
      blobs.push(blob);
    }
  }
  if (preview !== undefined) {
    tags.splice(0, tags.length, ...tags.filter((tag) => tag[0] !== "preview"));
    const data = await readMediaFile(resolvePath(cwd, preview.path), "metadata.preview");
    const { tag, blob } = await buildMediaTag("preview", data, {
      alt: preview.alt, duration: preview.duration, label: "metadata.preview",
    });
    tags.push(tag);
    blobs.push(blob);
  }
  return blobs;
}

async function readMediaFile(path: string, label: string): Promise<Uint8Array> {
  try {
    return await Deno.readFile(path);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) throw new Error(`${label}: media file not found: ${path}`);
    throw error;
  }
}

/** Compatibility view that exposes the content as a description publishing hint.
 * @param indexHtmlPath Built artifact.
 * @param manifestPath Optional sidecar.
 * @param config Explicit publishing metadata.
 * @param format Requested output format.
 * @returns Resolved tags, preceded by the description hint when present.
 * @example await readManifestMetadataTags("dist/index.html", undefined, {})
 */
export async function readManifestMetadataTags(
  indexHtmlPath: string | undefined,
  manifestPath: string | undefined,
  config: Pick<NappletConfig, "metadata">,
  format: ManifestFormat = "current",
): Promise<string[][]> {
  const metadata = await readManifestMetadata(indexHtmlPath, manifestPath, config, format);
  return [...(metadata.content ? [["description", metadata.content]] : []), ...metadata.tags];
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

async function readPluginManifestMetadata(
  manifestPath: string | undefined,
  format: ManifestFormat,
): Promise<{ tags: string[][]; content?: string }> {
  if (!manifestPath) return { tags: [] };
  try {
    const value = JSON.parse(await Deno.readTextFile(manifestPath)) as { tags?: unknown; content?: unknown };
    if (!Array.isArray(value.tags)) return { tags: [] };
    const input = value.tags.filter((tag): tag is string[] =>
      Array.isArray(tag) && typeof tag[0] === "string" &&
      tag.every((part: unknown) => typeof part === "string"));
    let content = typeof value.content === "string" && value.content.trim() ? value.content : undefined;
    const current = content !== undefined || input.some((tag) => tag[0] === "x" && tag.length === 2);
    const tags: string[][] = [];
    for (const tag of input) {
      if (format === "legacy" && ["d", "server", "a", "A"].includes(tag[0])) continue;
      if (!current && tag[0] === "description") content = tag[1];
      else if (!current && ["path", "x"].includes(tag[0])) continue;
      else if (!current && tag[0] === "requires") {
        const domain = tag[1]?.trim();
        if (domain) tags.push(["R", domain]);
      } else if (!current && isCanonicalArchetypeTag(tag)) {
        if (format === "legacy") tags.push([...tag]);
        else tags.push(["z", tag[1]], ["i", tag[2]]);
      } else tags.push([...tag]);
    }
    return { tags: dedupeTags(tags), content };
  } catch (error) {
    if (error instanceof Deno.errors.NotFound || error instanceof SyntaxError) return { tags: [] };
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
  if (metadata.sourceCommit !== undefined) replaced.add("source-commit");
  if (metadata.sourceArchive !== undefined) replaced.add("source-archive");
  if (metadata.title) replaced.add("title");
  if (metadata.archetypes !== undefined) {
    replaced.add("z");
    replaced.add("i");
    if (format === "legacy") replaced.add("archetype");
  }
  if (metadata.requires !== undefined) replaced.add("R");
  if (metadata.optional !== undefined) replaced.add("O");
  const result = tags.filter((tag) => !replaced.has(tag[0]));
  if (source) result.push(["source", source]);
  if (metadata.sourceCommit) result.push(["source-commit", metadata.sourceCommit]);
  if (metadata.sourceArchive) {
    const { url, sha256, mimeType } = metadata.sourceArchive;
    result.push(["source-archive", url, sha256, mimeType]);
  }
  if (metadata.title) result.push(["title", metadata.title]);
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
    // Only normalize metadata owned by this publisher. Extension multiplicity
    // and payload elements belong to their authors (NIP-01 event tags).
    if (["R", "O", "z", "i", "icon", "title", "source", "d", "server", "a", "A"].includes(tag[0])) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    result.push([...tag]);
  }
  return result.filter((tag, index) =>
    !["title", "source", "d", "icon", "a", "A"].includes(tag[0]) ||
    result.findLastIndex((other) => other[0] === tag[0]) === index
  );
}
