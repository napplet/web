import { readManifestMetadataTags } from "./manifest-metadata.ts";
import { readEditableConfig } from "./editable-config.ts";
import { CONFIG_DIR, CONFIG_FILE, type NappletCandidate, type NappletConfig } from "./types.ts";
import { basename, joinPath, relativePath, resolvePath } from "./path.ts";

const IGNORE_DIRS = new Set([
  ".git",
  ".napplet",
  ".turbo",
  "node_modules",
  "coverage",
]);

/** discover napplets helper for napplet discovery. */
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

/** A directory carrying its own `.napplet` configuration. */
export interface NappletProject {
  /** Folder name of the project directory. */
  name: string;
  /** Absolute project directory. */
  dir: string;
  /** Absolute path of the project's configuration file. */
  configPath: string;
}

/** A discovered build together with the project configuration that owns it. */
export interface NappletProjectCandidate extends NappletCandidate {
  /** Project directory relative to the search root. */
  project: string;
  /** Absolute path of the project's configuration file. */
  configPath: string;
}

/**
 * Report whether a directory holds a `.napplet` configuration, including a legacy JSON file awaiting migration.
 * @param dir Directory to inspect.
 * @returns True when `.napplet/config.yaml` or `.napplet/config.json` exists.
 * @example await hasNappletConfig(Deno.cwd())
 */
export async function hasNappletConfig(dir: string = Deno.cwd()): Promise<boolean> {
  return (await projectConfigPath(dir)) !== null;
}

/**
 * Find napplet projects below a directory that has no configuration of its own.
 * Each directory holding `.napplet/config.yaml` is one project; the walk does not descend into it.
 * @param cwd Directory to search from.
 * @returns Projects sorted by directory.
 * @example await findNappletProjects("/work/monorepo")
 */
export async function findNappletProjects(cwd: string = Deno.cwd()): Promise<NappletProject[]> {
  const projects: NappletProject[] = [];
  await walkForProjects(resolvePath(Deno.cwd(), cwd), projects);
  projects.sort((a, b) => a.dir.localeCompare(b.dir));
  return projects;
}

/**
 * Resolve each project's build candidates from that project's own configuration.
 * @param projects Projects returned by `findNappletProjects`.
 * @param cwd Search root used for relative project names.
 * @returns Candidates annotated with their project and configuration path, plus projects without a build.
 * @example await discoverProjectNapplets(await findNappletProjects())
 */
export async function discoverProjectNapplets(
  projects: NappletProject[],
  cwd: string = Deno.cwd(),
): Promise<{ candidates: NappletProjectCandidate[]; unbuilt: NappletProject[] }> {
  const candidates: NappletProjectCandidate[] = [];
  const unbuilt: NappletProject[] = [];
  for (const project of projects) {
    const config = await readProjectConfig(project);
    const found = await discoverNapplets(config, { cwd: project.dir });
    if (!found.length) unbuilt.push(project);
    const name = relativePath(cwd, project.dir);
    for (const candidate of found) {
      // Name builds after their project: inferName is relative to the search root, not the project.
      candidates.push({ ...candidate, name: project.name, project: name, configPath: project.configPath });
    }
  }
  return { candidates, unbuilt };
}

/**
 * Read a discovered project's configuration, naming the project in any error.
 * @param project Project returned by `findNappletProjects`.
 * @returns The project's configuration.
 * @example await readProjectConfig(project)
 */
export async function readProjectConfig(project: NappletProject): Promise<NappletConfig> {
  try {
    const config = await readEditableConfig(project.configPath);
    if (!config) throw new Error("configuration is empty");
    return config;
  } catch (error) {
    throw new Error(`${project.configPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function walkForProjects(dir: string, projects: NappletProject[]): Promise<void> {
  const configPath = await projectConfigPath(dir);
  if (configPath) {
    projects.push({ name: basename(dir), dir, configPath });
    return;
  }
  for (const entry of await readDirectories(dir)) {
    await walkForProjects(joinPath(dir, entry), projects);
  }
}

async function projectConfigPath(dir: string): Promise<string | null> {
  const yaml = joinPath(dir, CONFIG_DIR, CONFIG_FILE);
  if (await exists(yaml)) return yaml;
  // A legacy JSON config still marks a project; reading it reports the migration step.
  const legacy = joinPath(dir, CONFIG_DIR, CONFIG_FILE.replace(/\.yaml$/, ".json"));
  return await exists(legacy) ? yaml : null;
}

async function readDirectories(dir: string): Promise<string[]> {
  const names: string[] = [];
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (entry.isDirectory && !IGNORE_DIRS.has(entry.name)) names.push(entry.name);
    }
  } catch {
    // Unreadable directories cannot hold discoverable napplets.
  }
  return names;
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

  for (const entry of await readDirectories(dir)) {
    await walkForNapplets(joinPath(dir, entry), cwd, seen, candidates);
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
  const sidecarPath = joinPath(dir, ".nip5a-manifest.json");
  const manifestPath = await exists(sidecarPath) ? sidecarPath : undefined;
  return {
    name: inferName(relative),
    publishingId: (await readManifestMetadataTags(indexHtml, manifestPath, {})).find((tag) =>
      tag[0] === "d"
    )?.[1],
    dir,
    indexHtml,
    manifestPath,
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
