import type { NappletCandidate, NappletConfig } from "./types.ts";
import { basename, joinPath, relativePath, resolvePath } from "./path.ts";

const IGNORE_DIRS = new Set([
  ".git",
  ".napplet",
  ".turbo",
  "node_modules",
  "coverage",
]);

export async function discoverNapplets(
  config: NappletConfig,
  options: { cwd?: string; traverse?: boolean } = {},
): Promise<NappletCandidate[]> {
  const cwd = options.cwd ?? Deno.cwd();
  const traverse = options.traverse ?? false;
  const roots = traverse && config.discover?.enabled !== false
    ? config.discover?.roots ?? ["."]
    : [config.sourceDir];
  const seen = new Set<string>();
  const candidates: NappletCandidate[] = [];

  for (const root of roots) {
    const absoluteRoot = resolvePath(cwd, root);
    if (traverse) {
      await walkForNapplets(absoluteRoot, cwd, seen, candidates);
    } else {
      const candidate = await candidateFromDir(absoluteRoot, cwd);
      if (candidate && !seen.has(candidate.indexHtml)) {
        seen.add(candidate.indexHtml);
        candidates.push(candidate);
      }
    }
  }

  candidates.sort((a, b) => a.dir.localeCompare(b.dir));
  return candidates;
}

async function walkForNapplets(
  dir: string,
  cwd: string,
  seen: Set<string>,
  candidates: NappletCandidate[],
): Promise<void> {
  const candidate = await candidateFromDir(dir, cwd);
  if (candidate && !seen.has(candidate.indexHtml)) {
    seen.add(candidate.indexHtml);
    candidates.push(candidate);
    return;
  }

  let entries: Deno.DirEntry[];
  try {
    entries = [];
    for await (const entry of Deno.readDir(dir)) entries.push(entry);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory || IGNORE_DIRS.has(entry.name)) continue;
    await walkForNapplets(joinPath(dir, entry.name), cwd, seen, candidates);
  }
}

async function candidateFromDir(dir: string, cwd: string): Promise<NappletCandidate | null> {
  const distIndex = joinPath(dir, "dist", "index.html");
  if (await exists(distIndex)) {
    return buildCandidate(joinPath(dir, "dist"), distIndex, cwd);
  }
  const index = joinPath(dir, "index.html");
  if (await exists(index)) return buildCandidate(dir, index, cwd);
  return null;
}

async function buildCandidate(
  dir: string,
  indexHtml: string,
  cwd: string,
): Promise<NappletCandidate> {
  const relative = relativePath(cwd, dir);
  const manifestPath = joinPath(dir, ".nip5a-manifest.json");
  return {
    name: inferName(relative),
    dir,
    indexHtml,
    manifestPath: await exists(manifestPath) ? manifestPath : undefined,
  };
}

function inferName(relative: string): string {
  const leaf = basename(relative === "." ? "root" : relative);
  return leaf === "dist" ? basename(relativePath(".", relative).replace(/\/dist$/, "")) : leaf;
}

async function exists(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path);
    return stat.isFile;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}
