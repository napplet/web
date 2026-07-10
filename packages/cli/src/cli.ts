#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env --allow-net

/**
 * Executable entrypoint for the `napplet` command.
 *
 * @module
 */

import { configPath, initConfig, readConfig } from "./config.ts";
import { createDebugReport, createSigningDebugInfo } from "./debug.ts";
import { createDeployPlan } from "./deploy-plan.ts";
import { createDeploySigner } from "./deploy-signer.ts";
import { executeNetworkDeploy, networkDeploySucceeded } from "./deploy-network.ts";
import { discoverNapplets } from "./discover.ts";
import { collectFlags, first, type FlagBag } from "./flags.ts";
import { type InitWizardResult, promptInitWizard } from "./init-wizard.ts";
import { commandKeys } from "./keys-command.ts";
import { createDeployManifestTemplates } from "./manifest.ts";
import {
  createDeployProgressReporter,
  isTerminalOutput,
  renderDeployReport,
  renderInitReport,
} from "./output.ts";
import { isTerminalInput } from "./prompt.ts";
import { runCommand, splitCommand } from "./process.ts";
import { resolveSigningMethod, signDeployManifestTemplates } from "./signing.ts";
import { getBlossomServerSuggestions, getRelaySuggestions } from "./suggestions.ts";
import type { DeploySelection, NappletConfig } from "./types.ts";

const HELP = `@napplet/cli

Usage:
  napplet init [--force] [--root] [--source-dir <dir>] [--relay <url>] [--server <url>] [--name <dtag>]
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

Current scope:
  deploy uploads files to configured Blossom servers and publishes signed
  root/named/snapshot manifest events to configured relays for local or NIP-46 signers.
  Interactive terminals receive a human deploy report; use --json for CI output.
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
  const seed = {
    force: flags.boolean.has("force"),
    sourceDir: first(flags.values.get("source-dir")),
    relays: flags.values.get("relay") ?? [],
    blossomServers: flags.values.get("server") ?? [],
    named: flags.values.get("name") ?? [],
    root: flags.boolean.has("root"),
  };
  let options: InitWizardResult;
  const interactive = isTerminalInput();
  if (interactive) {
    console.error("Discovering relay and Blossom server suggestions...");
    const relaySuggestions = await getRelaySuggestions();
    const blossomSuggestions = await getBlossomServerSuggestions({
      relays: seed.relays.length > 0 ? seed.relays : relaySuggestions.slice(0, 4),
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
      named: seed.root ? [] : seed.named,
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
  });
  console.log(renderInitReport(result));
  return 0;
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
  const config = await loadConfig(flags);
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
  const base = splitCommand(config.conformance?.command ?? "napplet-conformance");
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
  const result = await runCommand(base.command, [...base.args, "paja", ...flags.afterDoubleDash]);
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
