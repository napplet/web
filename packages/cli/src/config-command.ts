/** Guided project configuration for CLI commands. */
import { configPath, defaultConfig, initConfig, parseArchetypeConventions, writeConfig } from "./config.ts";
import { collectFlags, first, type FlagBag } from "./flags.ts";
import { type InitWizardResult, normalizeNamedDTags, promptInitWizard, titleFromName } from "./init-wizard.ts";
import { type InitReport, renderInitReport } from "./output.ts";
import { canPrompt } from "./interaction.ts";
import { getBlossomServerSuggestions, getRelaySuggestions } from "./suggestions.ts";
import type { NappletConfig } from "./types.ts";
import { confirm } from "./command-prompts.ts";
import { readEditableConfig } from "./editable-config.ts";

/**
 * Initialize or complete project settings using the invocation's prompt policy.
 * @param argv Initialization flags.
 * @returns Zero on success.
 * @example await commandInit(["--name", "notes"])
 */
export async function commandInit(argv: string[]): Promise<number> {
  const flags = collectFlags(argv);
  const existing = await readEditableConfig(first(flags.values.get("config")));
  if (existing && !flags.boolean.has("force")) {
    if (canPrompt()) {
      const result = await runInitFromFlags(flags, existing);
      console.log(renderInitReport(result));
      return 0;
    }
    console.log(renderInitReport({ path: first(flags.values.get("config")) ?? configPath(), config: existing, created: false }));
    return 0;
  }
  const result = await runInitFromFlags(flags);
  console.log(renderInitReport(result));
  return 0;
}

/**
 * Apply explicit inputs and request missing settings before writing configuration.
 * @param flags Parsed initialization inputs.
 * @param existing Settings to preserve while completing gaps.
 * @returns Saved configuration and its location.
 * @example await runInitFromFlags(collectFlags(["--name", "notes"]))
 */
export async function runInitFromFlags(flags: FlagBag, existing?: NappletConfig): Promise<InitReport> {
  const seed = {
    force: flags.boolean.has("force"),
    sourceDir: first(flags.values.get("source-dir")) ?? existing?.sourceDir,
    relays: flags.values.get("relay") ?? existing?.relays ?? [],
    blossomServers: flags.values.get("server") ?? existing?.blossomServers ?? [],
    named: flags.values.get("name") ?? existing?.named ?? [],
    title: first(flags.values.get("title")) ?? existing?.metadata?.title,
    description: first(flags.values.get("description")) ?? existing?.metadata?.description,
    archetypes: flags.values.get("archetype") ?? existing?.metadata?.archetypes?.map((a) => `${a.slug}:${a.convention}`) ?? [],
    root: flags.boolean.has("root") || existing?.defaultTarget === "root",
  };
  let options: InitWizardResult;
  const interactive = canPrompt() && !flags.boolean.has("non-interactive");
  if (interactive) {
    if (!seed.relays.length || !seed.blossomServers.length) console.error("Finding optional relay and Blossom suggestions...");
    const relaySuggestions = seed.relays.length ? seed.relays : await getRelaySuggestions({ maxWait: 2000 });
    const blossomSuggestions = seed.blossomServers.length ? seed.blossomServers : await getBlossomServerSuggestions({
      relays: seed.relays.length > 0 ? seed.relays : relaySuggestions.slice(0, 24),
      maxWait: 2000,
    });
    console.error(
      `Suggestions ready: ${relaySuggestions.length} relays, ` +
        `${blossomSuggestions.length} Blossom servers.`,
    );
    options = await promptInitWizard({
      seed,
      suggestions: {
        relays: relaySuggestions,
        blossomServers: blossomSuggestions,
      },
    });
  } else {
    options = {
      sourceDir: seed.sourceDir ?? ".",
      relays: seed.relays,
      blossomServers: seed.blossomServers,
      named: seed.root ? [] : normalizeNamedDTags(seed.named.length > 0 ? seed.named : ["default"]),
      title: seed.title ?? titleFromName(seed.named[0] ?? "default"),
      description: seed.description?.trim() || undefined,
      archetypes: parseArchetypeConventions(seed.archetypes),
      defaultTarget: seed.root ? "root" as const : "named" as const,
    };
  }
  if (existing) {
    const config = defaultConfig({ ...existing, sourceDir: options.sourceDir, relays: options.relays, blossomServers: options.blossomServers, named: options.named, defaultTarget: options.defaultTarget, metadata: {
      ...existing.metadata, title: options.title, description: options.description,
      archetypes: existing.metadata?.archetypes ?? options.archetypes,
    } });
    if (existing.defaultTarget === "snapshot") config.defaultTarget = "snapshot";
    const path = first(flags.values.get("config")) ?? configPath();
    await writeConfig(config, path);
    return { path, config, created: false };
  }
  const result = await initConfig({
    path: first(flags.values.get("config")),
    force: seed.force,
    sourceDir: options.sourceDir,
    relays: options.relays,
    blossomServers: options.blossomServers,
    named: options.named,
    defaultTarget: options.defaultTarget,
    metadata: {
      name: options.defaultTarget === "named" ? options.named[0] : undefined,
      title: options.title,
      description: options.description,
      archetypes: options.archetypes,
    },
  });
  return result;
}

export interface DeployConfigLoaderOptions {
  readConfig?: (path?: string) => Promise<NappletConfig | null>;
  confirmCreate?: typeof confirm;
  isTerminalInput?: () => boolean;
  runInit?: (flags: FlagBag) => Promise<InitReport>;
  printStatus?: (line: string) => void;
  printReport?: (report: string) => void;
}

/**
 * Resolve deploy configuration, bootstrapping through guided init for first-run terminals.
 *
 * @param flags Parsed CLI flags for the deploy invocation.
 * @param jsonOutput Whether deploy output must remain machine-readable JSON.
 * @param options Test seams for I/O and initialization.
 * @returns The loaded or newly initialized config.
 * @example await loadDeployConfig(collectFlags([]), false)
 */
export async function loadDeployConfig(
  flags: FlagBag,
  jsonOutput: boolean,
  options: DeployConfigLoaderOptions = {},
): Promise<NappletConfig> {
  const path = first(flags.values.get("config"));
  const config = await (options.readConfig ?? readEditableConfig)(path);
  if (config) return config;
  const terminalInput = options.isTerminalInput ?? canPrompt;
  if (jsonOutput || flags.boolean.has("non-interactive") || !terminalInput()) {
    throw new Error(`No .napplet config found${path ? ` at ${path}` : ""}. Run: napplet init`);
  }
  if (path && !await (options.confirmCreate ?? confirm)(`No config found at ${path}. Create it?`, false)) {
    throw new Error(`No .napplet config found at ${path}. Run: napplet init --config ${path}`);
  }

  const printStatus = options.printStatus ?? console.error;
  const printReport = options.printReport ?? console.log;
  printStatus("No .napplet config found. Starting interactive setup...");
  const result = await (options.runInit ?? runInitFromFlags)(flags);
  printReport(renderInitReport(result));
  return result.config;
}

/**
 * Load project configuration or initialize it when prompts are allowed.
 * @param flags Parsed command inputs, including an optional config path.
 * @returns Existing or newly created settings.
 * @example await loadProjectConfig(collectFlags([]))
 */
export async function loadProjectConfig(flags: FlagBag): Promise<NappletConfig> {
  const path = first(flags.values.get("config"));
  const config = await readEditableConfig(path);
  if (!config) {
    if (canPrompt()) {
      console.error("No .napplet config found. Starting interactive setup...");
      const result = await runInitFromFlags(flags);
      console.log(renderInitReport(result));
      return result.config;
    }
    throw new Error(`No .napplet config found${path ? ` at ${path}` : ""}. Run: napplet init`);
  }
  return config;
}
