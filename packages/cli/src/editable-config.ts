/** Recover incomplete application metadata at the command boundary, retaining strict library validation. */
import { configPath, normalizeConfig, readConfig, writeConfig } from "./config.ts";
import {
  configDocumentData, parseConfigDocument, renderConfigYaml, requireYamlConfig,
  writeConfigText, yamlConfigPath,
} from "./config-storage.ts";
import { confirm, promptRequired } from "./command-prompts.ts";
import { canPrompt } from "./interaction.ts";
import type { NappletConfig } from "./types.ts";

/**
 * Read project settings, offering to complete missing Zapstore identity fields.
 * @param path Explicit path or the current project's default.
 * @returns Valid configuration, or null when absent.
 * @example await readEditableConfig()
 */
export async function readEditableConfig(path = configPath()): Promise<NappletConfig | null> {
  await requireYamlConfig(path);
  path = yamlConfigPath(path);
  try { return await readConfig(path); }
  catch (error) {
    if (!canPrompt() || !(error instanceof Error) || !/^zapstore\.(id|name) must be/.test(error.message)) throw error;
    const raw = configDocumentData(parseConfigDocument(await Deno.readTextFile(path), path), path);
    if (!raw || typeof raw !== "object" || !("zapstore" in raw)) throw error;
    const app = raw.zapstore;
    if (!app || typeof app !== "object" || Array.isArray(app)) throw error;
    let changed = false;
    for (const key of ["id", "name"] as const) {
      const value = Object.hasOwn(app, key) ? Reflect.get(app, key) : undefined;
      if (value !== undefined && (typeof value !== "string" || value.trim())) continue;
      Reflect.set(app, key, await promptRequired({ message: key === "id" ? "Zapstore application ID" : "Zapstore display name" }));
      changed = true;
    }
    if (!changed) throw error;
    const config = normalizeConfig(raw);
    if (await confirm("Save completed application settings?", true)) await writeConfig(config, path);
    return config;
  }
}

/**
 * Persist signer references without saving transient deployment settings.
 * @param updated Configuration containing the connected signer's public references.
 * @param path Project configuration path.
 * @returns Resolves after updating only signing fields on disk.
 * @example await saveDeploySigner(config, ".napplet/config.yaml")
 */
export async function saveDeploySigner(updated: NappletConfig, path = configPath()): Promise<void> {
  // Re-read the persisted document: the user may have declined to save prompted
  // metadata or supplied destination overrides for this deployment only.
  await requireYamlConfig(path);
  path = yamlConfigPath(path);
  const previous = await Deno.readTextFile(path);
  const persisted = configDocumentData(parseConfigDocument(previous, path), path);
  const mode = (await Deno.stat(path)).mode ?? undefined;
  await writeConfigText(path, renderConfigYaml({
    ...persisted, signing: updated.signing, bunkerPubkey: updated.bunkerPubkey,
  }, previous, path), { mode });
}
