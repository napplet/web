#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env --allow-net

/**
 * Executable entrypoint for the `napplet` command.
 *
 * @module
 */

import { configPath, initConfig, parseArchetypeConventions, readConfig } from "./config.ts";
import { createDebugReport, createSigningDebugInfo } from "./debug.ts";
import { createDeployPlan } from "./deploy-plan.ts";
import { createDeploySigner } from "./deploy-signer.ts";
import { executeNetworkDeploy, networkDeploySucceeded } from "./deploy-network.ts";
import { discoverNapplets } from "./discover.ts";
import { collectFlags, first, type FlagBag } from "./flags.ts";
import { commandGuide } from "./guide.ts";
import {
  type InitWizardResult,
  normalizeNamedDTags,
  promptInitWizard,
  titleFromName,
} from "./init-wizard.ts";
import { commandKeys } from "./keys-command.ts";
import { createDeployManifestTemplates } from "./manifest.ts";
import {
  createDeployProgressReporter,
  type InitReport,
  isTerminalOutput,
  renderDeployReport,
  renderInitReport,
} from "./output.ts";
import { isTerminalInput } from "./prompt.ts";
import { type CommandRunner, runCommand, splitCommand } from "./process.ts";
import { resolveSigningMethod, signDeployManifestTemplates } from "./signing.ts";
import { getBlossomServerSuggestions, getRelaySuggestions } from "./suggestions.ts";
import type { DeploySelection, NappletConfig } from "./types.ts";

const HELP = `@napplet/cli

Usage:
  napplet guide
  napplet create <directory> [--template <path-or-url>] [--force]
  napplet init [--force] [--root] [--source-dir <dir>] [--name <dtag>] [--title <title>] [--description <text>] [--archetype <slug:napplet:<archetype>/<intent>>] [--relay <url>] [--server <url>]
  napplet skills <list|print|install> [args]
  napplet deploy [--config <file>] [--all] [--root] [--name <dtag>] [--snapshot] [--sec <secret>] [--prompt-sec] [--dry-run] [--json]
  napplet debug [--config <file>] [--all] [--root] [--name <dtag>] [--snapshot] [--sec <secret>]
  napplet keys store --name <ref> [--sec <secret> | --prompt-sec]
  napplet keys connect --name <ref> [--relay <url> ...] [--config <file>]
  napplet keys use --name <ref> [--config <file>]
  napplet keys list
  napplet keys delete --name <ref>
  napplet keys doctor
  napplet discover [--config <file>] [--all]
  napplet conformance [--config <file>] [--all] [-- <args>]
  napplet paja [--config <file>] [-- <args>]

Run "napplet guide" for the complete developer workflow and documentation.
`;

interface ParsedArgs {
  command: string;
  rest: string[];
}

/**
 * Run the CLI command dispatcher.
 *
 * @param argv Command-line arguments, excluding executable name.
 * @returns Process exit code.
 */
export async function main(argv = Deno.args): Promise<number> {
  const parsed = parseCommand(argv);
  try {
    switch (parsed.command) {
      case "help":
      case "--help":
      case "-h":
        console.log(HELP);
        return 0;
      case "init":
        return await commandInit(parsed.rest);
      case "guide":
        return commandGuide();
      case "create":
        return await runPackageCli("@napplet/boilerplate", parsed.rest);
      case "skills":
        return await runPackageCli("@napplet/skills", parsed.rest);
      case "discover":
        return await commandDiscover(parsed.rest);
      case "deploy":
        return await commandDeploy(parsed.rest);
      case "debug":
        return await commandDebug(parsed.rest);
      case "keys":
        return await commandKeys(parsed.rest, HELP);
      case "conformance":
        return await commandConformance(parsed.rest);
      case "paja":
        return await commandPaja(parsed.rest);
      default:
        console.error(`Unknown command: ${parsed.command}\n`);
        console.error(HELP);
        return 2;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

export interface PackageCliRunOptions {
  runner?: CommandRunner;
  writeStdout?: (value: string) => void;
  writeStderr?: (value: string) => void;
  os?: typeof Deno.build.os;
}

export interface ResolvedCommand {
  command: string;
  args: string[];
}

/** Run one maintained package CLI without interpreting user arguments as shell source. */
export async function runPackageCli(
  packageName: "@napplet/boilerplate" | "@napplet/skills",
  args: readonly string[],
  options: PackageCliRunOptions = {},
): Promise<number> {
  const executable = (options.os ?? Deno.build.os) === "windows" ? "npx.cmd" : "npx";
  let result;
  try {
    result = await (options.runner ?? runCommand)(executable, ["--yes", packageName, ...args]);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(
        `Cannot run ${packageName}: install Node.js 20+ so the bundled npm package runner is available.`,
      );
    }
    throw error;
  }
  if (result.stdout) (options.writeStdout ?? console.log)(result.stdout.replace(/\n$/, ""));
  if (result.stderr) (options.writeStderr ?? console.error)(result.stderr.replace(/\n$/, ""));
  return result.code;
}

/** Resolve the default conformance runner through npm instead of requiring a global binary. */
export function resolveConformanceCommand(
  configuredCommand: string | undefined,
  os: typeof Deno.build.os = Deno.build.os,
): ResolvedCommand {
  const command = configuredCommand?.trim() || "napplet-conformance";
  if (command === "napplet-conformance") {
    return {
      command: os === "windows" ? "npx.cmd" : "npx",
      args: ["--yes", "@napplet/conformance-cli"],
    };
  }
  return splitCommand(command);
}

/** Preserve Kehto options while restoring the separator before a bare managed command. */
export function resolvePajaArgs(args: readonly string[]): string[] {
  if (args.length === 0 || args[0].startsWith("-") || args.includes("--")) return [...args];
  return ["--", ...args];
}

function parseCommand(argv: string[]): ParsedArgs {
  if (argv.length === 0) return { command: "help", rest: [] };
  const [command, ...rest] = argv;
  return { command, rest };
}

async function commandInit(argv: string[]): Promise<number> {
  const flags = collectFlags(argv);
  const existing = await readConfig();
  if (existing && !flags.boolean.has("force")) {
    console.log(renderInitReport({ path: configPath(), config: existing, created: false }));
    return 0;
  }
  const result = await runInitFromFlags(flags);
  console.log(renderInitReport(result));
  return 0;
}

async function runInitFromFlags(flags: FlagBag): Promise<InitReport> {
  const seed = {
    force: flags.boolean.has("force"),
    sourceDir: first(flags.values.get("source-dir")),
    relays: flags.values.get("relay") ?? [],
    blossomServers: flags.values.get("server") ?? [],
    named: flags.values.get("name") ?? [],
    title: first(flags.values.get("title")),
    description: first(flags.values.get("description")),
    archetypes: flags.values.get("archetype") ?? [],
    root: flags.boolean.has("root"),
  };
  let options: InitWizardResult;
  const interactive = isTerminalInput();
  if (interactive) {
    console.error("Discovering relay and Blossom server suggestions...");
    const relaySuggestions = await getRelaySuggestions();
    const blossomSuggestions = await getBlossomServerSuggestions({
      relays: seed.relays.length > 0 ? seed.relays : relaySuggestions.slice(0, 24),
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
  const result = await initConfig({
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

async function commandDiscover(argv: string[]): Promise<number> {
  const flags = collectFlags(argv);
  const config = await loadConfig(flags);
  const candidates = await discoverNapplets(config, { traverse: flags.boolean.has("all") });
  console.log(JSON.stringify(candidates, null, 2));
  return 0;
}

async function commandDeploy(argv: string[]): Promise<number> {
  const flags = collectFlags(argv);
  const jsonOutput = flags.boolean.has("json") || !isTerminalOutput();
  const config = await loadDeployConfig(flags, jsonOutput);
  const candidates = await discoverNapplets(config, { traverse: flags.boolean.has("all") });
  const selection: Partial<DeploySelection> = {
    root: flags.boolean.has("root") ? true : undefined,
    names: flags.values.get("name"),
    snapshot: flags.boolean.has("snapshot") ? true : undefined,
  };
  const signing = resolveSigningMethod(config, {
    sec: first(flags.values.get("sec")),
    promptSec: flags.boolean.has("prompt-sec"),
  });
  const plan = createDeployPlan(config, candidates, selection, {
    configPath: first(flags.values.get("config")),
    traverse: flags.boolean.has("all"),
  });

  const dryRun = flags.boolean.has("dry-run");
  const { signer, signing: deploySigning } = await createDeploySigner(signing, config, {
    sec: first(flags.values.get("sec")),
    required: !dryRun,
    interactiveConnect: !dryRun && isTerminalInput() && !jsonOutput,
    configPath: first(flags.values.get("config")),
    print: (line) => console.error(line),
    writePromptBytes: (bytes) => Deno.stderr.writeSync(bytes),
  });
  try {
    const signingInfo = createSigningDebugInfo(deploySigning);
    const manifests = signer
      ? await signDeployManifestTemplates(
        await createDeployManifestTemplates(plan, config, { sourcePubkey: signer.pubkey }),
        signer,
      )
      : await createDeployManifestTemplates(plan, config);
    if (!dryRun) {
      if (!signer) {
        throw new Error("Network deploy requires a signer from --sec, --prompt-sec, config, or CI");
      }
      const deploy = await executeNetworkDeploy(
        manifests,
        {
          relays: config.relays,
          blossomServers: config.blossomServers,
        },
        signer,
        {
          onProgress: jsonOutput ? undefined : createDeployProgressReporter(),
        },
      );
      const report = {
        signing: signingInfo,
        plan,
        manifests,
        deploy,
        relays: config.relays,
        blossomServers: config.blossomServers,
        dryRun: false,
      };
      console.log(jsonOutput ? JSON.stringify(report, null, 2) : renderDeployReport(report));
      return networkDeploySucceeded(deploy, manifests) ? 0 : 1;
    }
    const report = {
      signing: signingInfo,
      plan,
      manifests,
      relays: config.relays,
      blossomServers: config.blossomServers,
      dryRun: true,
    };
    console.log(jsonOutput ? JSON.stringify(report, null, 2) : renderDeployReport(report));
    return 0;
  } finally {
    await signer?.close?.();
  }
}

export interface DeployConfigLoaderOptions {
  readConfig?: (path?: string) => Promise<NappletConfig | null>;
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
 */
export async function loadDeployConfig(
  flags: FlagBag,
  jsonOutput: boolean,
  options: DeployConfigLoaderOptions = {},
): Promise<NappletConfig> {
  const path = first(flags.values.get("config"));
  const config = await (options.readConfig ?? readConfig)(path);
  if (config) return config;
  const terminalInput = options.isTerminalInput ?? isTerminalInput;
  if (path || jsonOutput || !terminalInput()) {
    throw new Error(`No .napplet config found${path ? ` at ${path}` : ""}. Run: napplet init`);
  }

  const printStatus = options.printStatus ?? console.error;
  const printReport = options.printReport ?? console.log;
  printStatus("No .napplet config found. Starting interactive setup...");
  const result = await (options.runInit ?? runInitFromFlags)(flags);
  printReport(renderInitReport(result));
  return result.config;
}

async function commandDebug(argv: string[]): Promise<number> {
  const flags = collectFlags(argv);
  const config = await loadConfig(flags);
  const selection: Partial<DeploySelection> = {
    root: flags.boolean.has("root") ? true : undefined,
    names: flags.values.get("name"),
    snapshot: flags.boolean.has("snapshot") ? true : undefined,
  };
  const signing = resolveSigningMethod(config, {
    sec: first(flags.values.get("sec")),
    promptSec: flags.boolean.has("prompt-sec"),
  });
  const report = await createDebugReport(config, {
    configPath: first(flags.values.get("config")),
    traverse: flags.boolean.has("all"),
    selection,
    signing,
  });
  console.log(JSON.stringify(report, null, 2));
  return 0;
}

async function commandConformance(argv: string[]): Promise<number> {
  const flags = collectFlags(argv);
  const config = await loadConfig(flags);
  const candidates = await discoverNapplets(config, { traverse: flags.boolean.has("all") });
  const base = resolveConformanceCommand(config.conformance?.command);
  const passthrough = flags.afterDoubleDash;
  for (const candidate of candidates) {
    const result = await runCommand(base.command, [...base.args, candidate.dir, ...passthrough]);
    Deno.stdout.writeSync(new TextEncoder().encode(result.stdout));
    Deno.stderr.writeSync(new TextEncoder().encode(result.stderr));
    if (result.code !== 0) return result.code;
  }
  return 0;
}

async function commandPaja(argv: string[]): Promise<number> {
  const flags = collectFlags(argv);
  const config = await loadConfig(flags);
  const base = splitCommand(config.paja?.command ?? "kehto");
  const result = await runCommand(base.command, [
    ...base.args,
    "paja",
    ...resolvePajaArgs(flags.afterDoubleDash),
  ]);
  Deno.stdout.writeSync(new TextEncoder().encode(result.stdout));
  Deno.stderr.writeSync(new TextEncoder().encode(result.stderr));
  return result.code;
}

async function loadConfig(flags: FlagBag): Promise<NappletConfig> {
  const path = first(flags.values.get("config"));
  const config = await readConfig(path);
  if (!config) {
    throw new Error(`No .napplet config found${path ? ` at ${path}` : ""}. Run: napplet init`);
  }
  return config;
}

if (import.meta.main) {
  Deno.exit(await main());
}
