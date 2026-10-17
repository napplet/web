/** YAML document storage shared by configuration readers, writers, and migration. */
import { Document, isMap, parseDocument } from "yaml";
import { dirname } from "./path.ts";

/** Resolve a configuration filename to YAML, including an old explicit JSON path.
 * @param path Requested configuration path.
 * @returns The YAML filename.
 * @example yamlConfigPath("settings.json") // "settings.yaml"
 */
export function yamlConfigPath(path: string): string {
  if (/\.json$/i.test(path)) return path.replace(/\.json$/i, ".yaml");
  if (!/\.ya?ml$/i.test(path)) throw new Error("Config path must end in .yaml, .yml, or legacy .json");
  return path;
}

/** Locate the legacy filename associated with a YAML configuration.
 * @param path Requested JSON or YAML filename.
 * @returns The legacy JSON filename.
 * @example legacyConfigPath("settings.yaml") // "settings.json"
 */
export function legacyConfigPath(path: string): string {
  return /\.json$/i.test(path) ? path : yamlConfigPath(path).replace(/\.ya?ml$/i, ".json");
}

/** Read optional text without hiding permission or other filesystem errors.
 * @param path File to read.
 * @returns File contents, or null when absent.
 * @example await readConfigText(".napplet/config.yaml")
 */
export async function readConfigText(path: string): Promise<string | null> {
  try {
    return await Deno.readTextFile(path);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return null;
    throw error;
  }
}

/** Reject unmigrated JSON before a public config reader or writer can use it.
 * @param path Requested configuration path.
 * @returns Resolves when no legacy file exists.
 * @example await requireYamlConfig(".napplet/config.yaml")
 */
export async function requireYamlConfig(path: string): Promise<void> {
  const legacy = legacyConfigPath(path);
  if (await readConfigText(legacy) !== null) {
    throw new Error(`Cannot continue without migrating ${legacy}. Run napplet with --migrate-config or in an interactive terminal.`);
  }
}

/** Parse a single YAML mapping while retaining its comments and node styles.
 * @param text YAML source.
 * @param path Filename used in diagnostics.
 * @returns A validated YAML document.
 * @example parseConfigDocument("version: 1\n", "config.yaml")
 */
export function parseConfigDocument(text: string, path: string): Document {
  const document = parseDocument(text, {
    version: "1.2", schema: "core", stringKeys: true, uniqueKeys: true, prettyErrors: false,
  });
  const problem = document.errors[0] ?? document.warnings[0];
  if (problem) throw new Error(`Invalid YAML in ${path}: ${problem.message}`);
  if (!isMap(document.contents)) throw new Error(`Config in ${path} must be a mapping`);
  configDocumentData(document, path);
  return document;
}

/** Convert a YAML mapping to the configuration's JSON-compatible data model.
 * @param document Parsed YAML document.
 * @param path Filename used in diagnostics.
 * @returns Plain configuration data.
 * @example configDocumentData(parseConfigDocument("version: 1", "config.yaml"))
 */
export function configDocumentData(document: Document, path = "config.yaml"): Record<string, unknown> {
  try {
    const value = document.toJS({ maxAliasCount: 100 });
    JSON.stringify(value, (_key, item) => {
      if (typeof item === "number" && !Number.isFinite(item)) throw new Error("non-finite number");
      return item;
    });
    return value as Record<string, unknown>;
  } catch {
    throw new Error(`Invalid YAML in ${path}: config values must be finite and must not contain cyclic or excessive aliases`);
  }
}

/** Render fresh YAML or update existing values without discarding unrelated comments.
 * @param value Configuration data to persist.
 * @param previous Existing YAML, if present.
 * @param path Filename used in diagnostics.
 * @returns Serialized YAML.
 * @example renderConfigYaml({ version: 1 })
 */
export function renderConfigYaml(value: object, previous: string | null = null, path = "config.yaml"): string {
  const next = JSON.parse(JSON.stringify(value));
  const document = previous === null ? new Document(next) : parseConfigDocument(previous, path);
  if (previous !== null) updateDocument(document, [], configDocumentData(document, path), next);
  return document.toString({ lineWidth: 0 });
}

function updateDocument(document: Document, path: string[], previous: unknown, next: unknown): void {
  if (JSON.stringify(previous) === JSON.stringify(next)) return;
  if (isRecord(previous) && isRecord(next) && isMap(document.getIn(path, true))) {
    for (const key of Object.keys(previous)) {
      if (!Object.hasOwn(next, key)) document.deleteIn([...path, key]);
    }
    for (const [key, value] of Object.entries(next)) {
      updateDocument(document, [...path, key], previous[key], value);
    }
  } else {
    document.setIn(path, next);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Atomically persist configuration text, optionally refusing to replace an existing file.
 * @param path Destination filename.
 * @param text Complete file contents.
 * @param options Creation and permission settings.
 * @returns Resolves after the complete file is installed.
 * @example await writeConfigText("config.yaml", "version: 1\n", { exclusive: true })
 */
export async function writeConfigText(
  path: string,
  text: string,
  options: { exclusive?: boolean; mode?: number } = {},
): Promise<void> {
  const directory = dirname(path);
  await Deno.mkdir(directory, { recursive: true });
  const temporary = await Deno.makeTempFile({ dir: directory, prefix: ".napplet-config-" });
  try {
    await Deno.writeTextFile(temporary, text);
    if (Deno.build.os !== "windows") await Deno.chmod(temporary, options.mode ?? 0o600);
    if (options.exclusive) await Deno.link(temporary, path);
    else await Deno.rename(temporary, path);
  } finally {
    await removeTemporaryConfig(temporary);
  }
}


async function removeTemporaryConfig(path: string): Promise<void> {
  try { await Deno.remove(path); } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      console.error(`Could not remove temporary config ${path}: ${error}`);
    }
  }
}
