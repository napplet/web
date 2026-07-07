import { joinPath } from "./path.ts";
import {
  type DeployManifestTemplate,
  type DeployPlan,
  type DeployPlanItem,
  type ManifestFileMapping,
  NAPPLET_KIND_NAMED,
  NAPPLET_KIND_ROOT,
  NAPPLET_KIND_SNAPSHOT,
  type NappletConfig,
  type NostrEventTemplate,
  type SnapshotDeploySource,
} from "./types.ts";

/** NAMED_SITE_D_TAG_PATTERN constant used by manifest construction helpers. */
export const NAMED_SITE_D_TAG_PATTERN = /^[a-z0-9-]{1,13}$/;

/** ManifestBuildOptions shape used by manifest construction helpers. */
export interface ManifestBuildOptions {
  createdAt?: number;
  servers?: string[];
  sourcePubkey?: string;
  metadataTags?: string[][];
}

/** SnapshotSourceRef shape used by manifest construction helpers. */
export interface SnapshotSourceRef {
  kind: typeof NAPPLET_KIND_ROOT | typeof NAPPLET_KIND_NAMED;
  pubkey: string;
  dTag?: string;
}

/** collect manifest files helper for manifest construction. */
export async function collectManifestFiles(dir: string): Promise<ManifestFileMapping[]> {
  const files: ManifestFileMapping[] = [];
  await collectManifestFilesInto(dir, "", files);
  if (files.length === 0) throw new Error(`No deployable files found in ${dir}`);
  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}

/** compute aggregate hash helper for manifest construction. */
export async function computeAggregateHash(
  files: readonly ManifestFileMapping[],
): Promise<string> {
  if (files.length === 0) throw new Error("Manifest must include at least one path tag");
  const lines = files.map((file) => {
    assertManifestFile(file);
    return `${file.sha256} ${file.path}\n`;
  }).sort();
  return await sha256Text(lines.join(""));
}

/** create site manifest template helper for manifest construction. */
export async function createSiteManifestTemplate(
  item: DeployPlanItem,
  files: readonly ManifestFileMapping[],
  options: ManifestBuildOptions = {},
): Promise<NostrEventTemplate> {
  if (item.target === "snapshot") {
    throw new Error("Use createSnapshotManifestTemplate for snapshot manifests");
  }
  const aggregateHash = await computeAggregateHash(files);
  const tags: string[][] = [];
  if (item.target === "named") tags.push(["d", normalizeDTag(item.dTag)]);
  for (const file of files) tags.push(["path", file.path, file.sha256]);
  tags.push(["x", aggregateHash, "aggregate"]);
  for (const server of options.servers ?? []) tags.push(["server", server]);
  for (const tag of options.metadataTags ?? []) tags.push([...tag]);
  return {
    kind: item.target === "root" ? NAPPLET_KIND_ROOT : NAPPLET_KIND_NAMED,
    created_at: options.createdAt ?? nowSeconds(),
    tags,
    content: "",
  };
}

/** create snapshot manifest template helper for manifest construction. */
export function createSnapshotManifestTemplate(
  source: NostrEventTemplate,
  sourceRef: SnapshotSourceRef,
  options: Pick<ManifestBuildOptions, "createdAt"> = {},
): NostrEventTemplate {
  if (source.kind !== NAPPLET_KIND_ROOT && source.kind !== NAPPLET_KIND_NAMED) {
    throw new Error("Snapshots can only copy root or named site manifests");
  }
  const aggregateTags = source.tags.filter((tag) => tag[0] === "x" && tag[2] === "aggregate");
  if (aggregateTags.length !== 1 || !aggregateTags[0][1]) {
    throw new Error("Snapshot source must include exactly one aggregate x tag");
  }
  const tags: string[][] = [["a", siteAddress(sourceRef)]];
  const originTag = source.tags.find((tag) => tag[0] === "A");
  if (originTag) tags.push([...originTag]);
  for (const tag of source.tags) {
    if (
      tag[0] === "path" || tag[0] === "server" || tag[0] === "title" || tag[0] === "description" ||
      tag[0] === "source" || tag[0] === "requires"
    ) {
      tags.push([...tag]);
    }
  }
  tags.push(["x", aggregateTags[0][1], "aggregate"]);
  return {
    kind: NAPPLET_KIND_SNAPSHOT,
    created_at: options.createdAt ?? nowSeconds(),
    tags,
    content: "",
  };
}

/** create deploy manifest templates helper for manifest construction. */
export async function createDeployManifestTemplates(
  plan: DeployPlan,
  config: NappletConfig,
  options: Pick<ManifestBuildOptions, "createdAt" | "sourcePubkey"> = {},
): Promise<DeployManifestTemplate[]> {
  const result: DeployManifestTemplate[] = [];
  const filesByDir = new Map<string, ManifestFileMapping[]>();
  const metadataByDir = new Map<string, string[][]>();
  const sourceTemplates = new Map<string, NostrEventTemplate>();
  for (const item of plan.items) {
    const files = filesByDir.get(item.candidate.dir) ??
      await collectManifestFiles(item.candidate.dir);
    filesByDir.set(item.candidate.dir, files);
    const metadataTags = metadataByDir.get(item.candidate.dir) ??
      dedupeTags([
        ...await readIndexHtmlMetadataTags(item.candidate.indexHtml),
        ...await readPluginManifestMetadataTags(item.candidate.manifestPath),
      ]);
    metadataByDir.set(item.candidate.dir, metadataTags);
    const aggregateHash = await computeAggregateHash(files);
    if (item.target === "snapshot") {
      const snapshot = createDeploySnapshotTemplate(item, sourceTemplates, options);
      result.push({
        item,
        files,
        aggregateHash,
        ...snapshot,
      });
      continue;
    }
    const template = await createSiteManifestTemplate(item, files, {
      createdAt: options.createdAt,
      servers: config.blossomServers,
      metadataTags,
    });
    sourceTemplates.set(
      deploySourceKey(item.candidate.dir, {
        target: item.target,
        kind: item.target === "root" ? NAPPLET_KIND_ROOT : NAPPLET_KIND_NAMED,
        dTag: item.dTag,
      }),
      template,
    );
    result.push({
      item,
      files,
      aggregateHash,
      template,
    });
  }
  return result;
}

function createDeploySnapshotTemplate(
  item: DeployPlanItem,
  sourceTemplates: ReadonlyMap<string, NostrEventTemplate>,
  options: { createdAt?: number; sourcePubkey?: string },
): Pick<DeployManifestTemplate, "template" | "skippedReason"> {
  if (!item.snapshotSource) {
    return { skippedReason: "snapshot template requires a root or named source target" };
  }
  if (!options.sourcePubkey) {
    return { skippedReason: "snapshot template requires the signer pubkey for its NIP-5A a tag" };
  }
  const source = sourceTemplates.get(deploySourceKey(item.candidate.dir, item.snapshotSource));
  if (!source) {
    return { skippedReason: "snapshot template requires its source template in the deploy plan" };
  }
  return {
    template: createSnapshotManifestTemplate(
      source,
      {
        kind: item.snapshotSource.kind,
        pubkey: options.sourcePubkey,
        dTag: item.snapshotSource.dTag,
      },
      { createdAt: options.createdAt },
    ),
  };
}

function deploySourceKey(candidateDir: string, source: SnapshotDeploySource): string {
  return `${candidateDir}\0${source.kind}\0${source.dTag ?? ""}`;
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
      if (!Array.isArray(tag) || tag[0] !== "requires" || typeof tag[1] !== "string") continue;
      const domain = tag[1].trim();
      if (isNapDomain(domain)) tags.push(["requires", domain]);
    }
    return dedupeTags(tags);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound || error instanceof SyntaxError) return [];
    throw error;
  }
}

/**
 * Read the NIP-5A single-value `title` / `description` manifest tags out of a
 * built `index.html`. These come from PLAIN HTML — the `<title>` element and a
 * `<meta name="description">` element (as authored by @napplet/vite-plugin's
 * title/description options) — NOT from any `napplet-*` protocol meta tag.
 *
 * Returns at most one `["title", value]` and one `["description", value]` tag.
 * Values are entity-decoded and trimmed; empty/whitespace-only values emit no
 * tag. A missing/unreadable file yields `[]` (mirrors readPluginManifestMetadataTags).
 */
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

/** Inner text of the FIRST `<title>…</title>`, decoded + trimmed; null if empty. */
function extractHtmlTitle(html: string): string | null {
  const match = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!match) return null;
  const value = decodeHtmlEntities(match[1]).trim();
  return value.length > 0 ? value : null;
}

/** `content` of the FIRST non-empty `<meta name="description">`, decoded + trimmed. */
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

/** Read one HTML attribute value off a tag (single/double/unquoted); null if absent. */
function getHtmlTagAttr(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = re.exec(tag);
  return match ? (match[1] ?? match[2] ?? match[3] ?? "") : null;
}

/** Decode the standard HTML entities. `&amp;` is decoded LAST to avoid double-decoding. */
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

/** site address helper for manifest construction. */
export function siteAddress(ref: SnapshotSourceRef): string {
  if (!/^[0-9a-f]{64}$/.test(ref.pubkey)) throw new Error("pubkey must be 64 lowercase hex chars");
  if (ref.kind === NAPPLET_KIND_ROOT) return `${NAPPLET_KIND_ROOT}:${ref.pubkey}:`;
  return `${NAPPLET_KIND_NAMED}:${ref.pubkey}:${normalizeDTag(ref.dTag)}`;
}

/** normalize d tag helper for manifest construction. */
export function normalizeDTag(value: string | undefined): string {
  const dTag = value?.trim() ?? "";
  if (!NAMED_SITE_D_TAG_PATTERN.test(dTag) || dTag.endsWith("-")) {
    throw new Error("Named napplet d tag must match ^[a-z0-9-]{1,13}$ and not end with '-'");
  }
  return dTag;
}

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

function isNapDomain(domain: string): boolean {
  return NAP_DOMAINS.has(domain);
}

async function collectManifestFilesInto(
  root: string,
  relativeDir: string,
  files: ManifestFileMapping[],
): Promise<void> {
  const dir = relativeDir === "" ? root : joinPath(root, relativeDir);
  for await (const entry of Deno.readDir(dir)) {
    const relative = relativeDir === "" ? entry.name : `${relativeDir}/${entry.name}`;
    if (entry.isDirectory) {
      await collectManifestFilesInto(root, relative, files);
      continue;
    }
    if (!entry.isFile || relative === ".nip5a-manifest.json") continue;
    files.push({
      path: `/${relative}`,
      sha256: await sha256File(joinPath(root, relative)),
    });
  }
}

async function sha256File(path: string): Promise<string> {
  const data = await Deno.readFile(path);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return hex(new Uint8Array(digest));
}

async function sha256Text(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return hex(new Uint8Array(digest));
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function assertManifestFile(file: ManifestFileMapping): void {
  if (!file.path.startsWith("/") || file.path.endsWith("/")) {
    throw new Error(`Manifest path must be an absolute file path: ${file.path}`);
  }
  if (!/^[0-9a-f]{64}$/.test(file.sha256)) {
    throw new Error(`Manifest sha256 must be lowercase hex: ${file.path}`);
  }
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
