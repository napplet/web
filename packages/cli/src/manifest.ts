import { buildLegacyManifestFields, computeAggregateHash } from "./manifest-legacy.ts";
import type { ManifestFormat } from "./manifest-format.ts";
export { computeAggregateHash } from "./manifest-legacy.ts";
import { joinPath } from "./path.ts";
import { readManifestMetadataTags } from "./manifest-metadata.ts";
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
export const NAMED_SITE_D_TAG_PATTERN = /^[a-z0-9-]+$/;

/** ManifestBuildOptions shape used by manifest construction helpers. */
export interface ManifestBuildOptions {
  createdAt?: number;
  servers?: string[];
  sourcePubkey?: string;
  metadataTags?: string[][];
  content?: string;
  format?: ManifestFormat;
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

/** create site manifest template helper for manifest construction. */
export async function createSiteManifestTemplate(
  item: DeployPlanItem,
  files: readonly ManifestFileMapping[],
  options: ManifestBuildOptions = {},
): Promise<NostrEventTemplate> {
  if (item.target === "snapshot") {
    throw new Error("Use createSnapshotManifestTemplate for snapshot manifests");
  }
  const format = options.format ?? "current";
  const metadataTags = options.metadataTags ?? [];
  const content = options.content ?? metadataTags.find((tag) => tag[0] === "description")?.[1] ??
    "";
  const fields = format === "legacy"
    ? await buildLegacyManifestFields(files, metadataTags, content)
    : buildCurrentManifestFields(files, metadataTags, content);
  const tags: string[][] = [];
  if (item.target === "named") tags.push(["d", normalizeDTag(item.dTag)]);
  tags.push(...fields.tags);
  for (const server of options.servers ?? []) tags.push(["server", server]);
  return {
    kind: item.target === "root" ? NAPPLET_KIND_ROOT : NAPPLET_KIND_NAMED,
    created_at: options.createdAt ?? nowSeconds(),
    tags,
    content: fields.content,
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
  const hashTags = source.tags.filter((tag) => tag[0] === "x");
  if (hashTags.length !== 1 || !/^[0-9a-f]{64}$/.test(hashTags[0][1])) {
    throw new Error("Snapshot source must include exactly one valid x tag");
  }
  const tags: string[][] = [["a", siteAddress(sourceRef)]];
  const originTag = source.tags.find((tag) => tag[0] === "A");
  if (originTag) tags.push([...originTag]);
  for (const tag of source.tags) {
    if (!["d", "a", "A"].includes(tag[0])) tags.push([...tag]);
  }
  return {
    kind: NAPPLET_KIND_SNAPSHOT,
    created_at: options.createdAt ?? nowSeconds(),
    tags,
    content: source.content,
  };
}

/** create deploy manifest templates helper for manifest construction. */
export async function createDeployManifestTemplates(
  plan: DeployPlan,
  config: NappletConfig,
  options: Pick<ManifestBuildOptions, "createdAt" | "sourcePubkey" | "format"> = {},
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
      await readManifestMetadataTags(
        item.candidate.indexHtml,
        item.candidate.manifestPath,
        config,
        options.format,
      );
    metadataByDir.set(item.candidate.dir, metadataTags);
    const format = options.format ?? "current";
    const index = files.find((file) => file.path === "/index.html");
    if (!index) throw new Error("NIP-5D requires /index.html");
    const artifactHash = index.sha256;
    const aggregateHash = format === "legacy" ? await computeAggregateHash(files) : undefined;
    const uploadFiles = format === "legacy"
      ? files
      : selectCurrentUploadFiles(item.candidate.dir, files, metadataTags);
    if (item.target === "snapshot") {
      const snapshot = createDeploySnapshotTemplate(item, sourceTemplates, options);
      result.push({
        item,
        files: uploadFiles,
        format,
        artifactHash,
        aggregateHash,
        ...snapshot,
      });
      continue;
    }
    const template = await createSiteManifestTemplate(item, files, {
      createdAt: options.createdAt,
      servers: config.blossomServers,
      metadataTags,
      format,
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
      files: uploadFiles,
      format,
      artifactHash,
      aggregateHash,
      template,
    });
  }
  return result;
}

/**
 * NIP-5D §Manifest: "A napplet is a single self-contained /index.html", so current deploys
 * publish only /index.html plus the blob an icon tag references. Any other collected file
 * would be silently dropped, so fail loudly instead. `.well-known` files count too because
 * legacy deploys would publish them and current events cannot carry them.
 */
function selectCurrentUploadFiles(
  dir: string,
  files: readonly ManifestFileMapping[],
  metadataTags: readonly string[][],
): ManifestFileMapping[] {
  const kept: ManifestFileMapping[] = [];
  const dropped: string[] = [];
  for (const file of files) {
    const isIcon = metadataTags.some((tag) => tag[0] === "icon" && tag[1] === file.sha256);
    if (file.path === "/index.html" || isIcon) kept.push(file);
    else dropped.push(file.path);
  }
  if (dropped.length > 0) {
    throw new Error([
      `Current NIP-5D deploys publish one self-contained /index.html (plus its icon blob); these built files in ${dir} would not be deployed:`,
      ...dropped.map((path) => `  - ${path}`),
      "Build a single-file artifact (the @napplet/vite-plugin default artifactMode: 'single-file') or deploy with --format legacy.",
    ].join("\n"));
  }
  return kept;
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
    return { skippedReason: "snapshot template requires the signer pubkey for its NIP-5D a tag" };
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
    throw new Error("Named napplet d tag must match ^[a-z0-9-]+$ and not end with '-'");
  }
  return dTag;
}

const DEPLOY_IGNORED_DIRECTORY_NAMES = new Set(["node_modules"]);

async function collectManifestFilesInto(
  root: string,
  relativeDir: string,
  files: ManifestFileMapping[],
): Promise<void> {
  const dir = relativeDir === "" ? root : joinPath(root, relativeDir);
  for await (const entry of Deno.readDir(dir)) {
    const relative = relativeDir === "" ? entry.name : `${relativeDir}/${entry.name}`;
    if (entry.isDirectory) {
      if (shouldSkipManifestDirectory(relative, entry.name)) continue;
      await collectManifestFilesInto(root, relative, files);
      continue;
    }
    if (!entry.isFile || shouldSkipManifestFile(relative, entry.name)) continue;
    files.push({
      path: `/${relative}`,
      sha256: await sha256File(joinPath(root, relative)),
    });
  }
}

function shouldSkipManifestDirectory(relative: string, name: string): boolean {
  return DEPLOY_IGNORED_DIRECTORY_NAMES.has(name) || hasHiddenSegment(relative);
}

function shouldSkipManifestFile(relative: string, name: string): boolean {
  return name === ".nip5a-manifest.json" || hasHiddenSegment(relative);
}

function hasHiddenSegment(relative: string): boolean {
  const segments = relative.replace(/\/$/, "").split("/");
  return segments.some((segment) => segment.startsWith(".") && segment !== ".well-known");
}

async function sha256File(path: string): Promise<string> {
  const data = await Deno.readFile(path);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return hex(new Uint8Array(digest));
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function buildCurrentManifestFields(
  files: readonly ManifestFileMapping[],
  metadata: readonly string[][],
  content: string,
): Pick<NostrEventTemplate, "tags" | "content"> {
  const index = files.filter((file) => file.path === "/index.html");
  if (index.length !== 1 || !/^[0-9a-f]{64}$/.test(index[0].sha256)) {
    throw new Error("NIP-5D requires one /index.html artifact hash");
  }
  if (!content.trim()) {
    throw new Error(
      "Set metadata.description in .napplet/config.json or an HTML description meta before deploying current NIP-5D events",
    );
  }
  for (const tag of metadata.filter((tag) => tag[0] === "R" || tag[0] === "O")) {
    if (tag.length !== 2 || !tag[1] || /[:\s]/.test(tag[1]) || tag[1].startsWith("NAP-")) {
      throw new Error("Capability tags must name one bare NAP domain");
    }
  }
  // NIP-5D §Archetypes and Intents: parameters are separate i-tag elements.
  for (const tag of metadata.filter((tag) => tag[0] === "i")) {
    if (!tag[1]?.trim() || tag[1].includes("?")) {
      throw new Error("Intent advertisements must be non-empty queryless identities");
    }
  }
  return {
    tags: [
      ["x", index[0].sha256],
      ...metadata.filter((tag) =>
        !["description", "x", "path", "d", "a", "A", "server"].includes(tag[0])
      ).map((tag) => [...tag]),
    ],
    content,
  };
}
