/** Consent and recoverable file conversion for legacy JSON configuration. */
import { configPath, normalizeConfig } from "./config.ts";
import {
  configDocumentData, legacyConfigPath, parseConfigDocument, readConfigText,
  renderConfigYaml, writeConfigText, yamlConfigPath,
} from "./config-storage.ts";
import { isTerminalInput, promptLine } from "./prompt.ts";

/** Explicit migration approval and injectable terminal I/O. */
export interface ConfigMigrationOptions {
  approve?: boolean;
  interactive?: boolean;
  prompt?: (message: string) => Promise<string>;
  print?: (message: string) => void;
}

/** Decide whether a migration may prompt on this invocation.
 * @returns True only for a terminal outside CI.
 * @example canPromptForConfigMigration()
 */
export function canPromptForConfigMigration(): boolean {
  const ci = Deno.env.get("CI")?.toLowerCase();
  return isTerminalInput() && (!ci || ci === "0" || ci === "false");
}

/** Convert a legacy configuration after consent, retaining its exact original bytes.
 * @param requested Requested configuration path, defaulting to the project configuration.
 * @param options Explicit approval or terminal prompt settings.
 * @returns YAML path for the command to use after migration.
 * @example await migrateConfig(".napplet/config.json", { approve: true })
 */
export async function migrateConfig(
  requested: string = configPath(),
  options: ConfigMigrationOptions = {},
): Promise<string> {
  const path = yamlConfigPath(requested);
  const legacy = legacyConfigPath(requested);
  const raw = await readConfigText(legacy);
  if (raw === null) return path;
  const data = parseLegacyConfig(raw, legacy);
  const backup = `${legacy}.bak`;
  const saved = await readConfigText(backup);
  if (saved !== null && saved !== raw) throw new Error(`Migration backup already exists with different contents: ${backup}`);
  const existing = await readConfigText(path);
  if (existing !== null) {
    const existingData = configDocumentData(parseConfigDocument(existing, path), path);
    if (saved !== raw || JSON.stringify(existingData) !== JSON.stringify(data)) {
      throw new Error(`Both ${legacy} and ${path} exist. Resolve the configuration conflict before migrating; neither file was changed.`);
    }
  }
  await confirmMigration(legacy, path, options);
  const mode = (await Deno.stat(legacy)).mode ?? undefined;
  if (saved === null) await writeConfigText(backup, raw, { exclusive: true, mode });
  if (existing === null) {
    await writeConfigText(path, renderConfigYaml(data), { exclusive: true, mode });
  }
  if (await Deno.readTextFile(legacy) !== raw) {
    throw new Error(`Configuration changed during migration: ${legacy}. Original backup and YAML were retained for recovery.`);
  }
  await Deno.remove(legacy);
  (options.print ?? console.error)(`Migrated ${legacy} to ${path}. Original saved as ${backup}.`);
  return path;
}

function parseLegacyConfig(raw: string, path: string): Record<string, unknown> {
  let data: unknown;
  try {
    data = JSON.parse(raw, (_key, value) => {
      if (typeof value === "number" && !Number.isFinite(value)) throw new Error("nonfinite");
      return value;
    });
  } catch {
    throw new Error(`Invalid JSON in ${path}; config numbers must be finite and syntax must be valid`);
  }
  normalizeConfig(data);
  return data as Record<string, unknown>;
}

async function confirmMigration(legacy: string, path: string, options: ConfigMigrationOptions): Promise<void> {
  if (options.approve) return;
  if (!(options.interactive ?? canPromptForConfigMigration())) {
    throw new Error(`Cannot continue without migrating ${legacy}. Run in an interactive terminal or pass --migrate-config to approve conversion to YAML.`);
  }
  const prompt = options.prompt ?? ((message) => promptLine({ message, defaultValue: "N" }));
  const answer = await prompt(`Legacy JSON config found at ${legacy}. Migrate to ${path} and retain a JSON backup? (y/N)`);
  if (!/^(y|yes)$/i.test(answer.trim())) throw new Error("Cannot continue without migrating");
}
