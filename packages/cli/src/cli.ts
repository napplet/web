#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env --allow-net

/**
 * Executable entrypoint for the `napplet` command.
 *
 * @module
 */

import { createDebugReport } from "./debug.ts";
import { discoverNapplets } from "./discover.ts";
import { collectFlags, first } from "./flags.ts";
import { commandGuide } from "./guide.ts";
import { commandKeys } from "./keys-command.ts";
import { commandMigrate } from "./migrate-command.ts";
import { selectManifestFormat } from "./manifest-format.ts";
import { isTerminalOutput } from "./output.ts";
import { PromptCancelledError } from "./prompt.ts";
import { canPrompt, resolveInteraction, withInteraction } from "./interaction.ts";
import { decorateReport, paint, renderBanner } from "./terminal.ts";
import { runCommand, splitCommand } from "./process.ts";
import { resolveSigningMethod } from "./signing.ts";
import type { DeploySelection } from "./types.ts";
import cliMetadata from "../deno.json" with { type: "json" };
import { managedPackageCommand } from "./managed-node.ts";
import { runPackageCli, resolveConformanceCommand, resolvePajaArgs, type ResolvedCommand } from "./package-runner.ts";
import { commandInit, loadProjectConfig } from "./config-command.ts";
import { commandDeploy } from "./deploy-command.ts";
import { commandHelp, HELP } from "./help.ts";
export { loadDeployConfig } from "./config-command.ts";
export type { DeployConfigLoaderOptions } from "./config-command.ts";
export { runPackageCli, resolveConformanceCommand, resolvePajaArgs } from "./package-runner.ts";
export type { PackageCliRunOptions, ResolvedCommand } from "./package-runner.ts";

interface ParsedArgs {
  command: string;
  rest: string[];
}

/** Callable adapter for a maintained package CLI. */
export type PackageCliRunner = (args: readonly string[]) => number | Promise<number>;

/** Optional maintained-package runners used by standalone builds. */
export interface CliMainOptions {
  runCreate?: PackageCliRunner;
  runScreenshot?: PackageCliRunner;
}

/**
 * Run the CLI command dispatcher.
 *
 * @param argv Command-line arguments, excluding executable name.
 * @param options Maintained-package runner overrides for standalone builds.
 * @returns Process exit code.
 */
export async function main(argv = Deno.args, options: CliMainOptions = {}): Promise<number> {
  const separator = argv.indexOf("--");
  const own = separator < 0 ? argv : argv.slice(0, separator);
  const passthrough = separator < 0 ? [] : argv.slice(separator);
  const switches = new Set(["-i", "--non-interactive", "--no-color"]);
  const parsed = parseCommand([...own.filter((arg) => !switches.has(arg)), ...passthrough]);
  if (["version", "--version", "-v"].includes(parsed.command)) return await dispatch(parsed, options);
  const policy = resolveInteraction({
    nonInteractive: own.includes("-i") || own.includes("--non-interactive"),
    noColor: own.includes("--no-color"),
    json: own.includes("--json") || ["debug", "discover", "migrate"].includes(parsed.command),
  });
  return await withInteraction(policy, () => {
    if (isTerminalOutput() && !own.includes("--json") && !["debug", "discover", "migrate"].includes(parsed.command)) {
      console.log(renderBanner(cliMetadata.version));
    }
    return dispatch(parsed, options);
  });
}

async function dispatch(parsed: ParsedArgs, options: CliMainOptions): Promise<number> {
  try {
    const own = parsed.rest.slice(0, parsed.rest.indexOf("--") < 0 ? undefined : parsed.rest.indexOf("--"));
    if (own.includes("--help") || own.includes("-h")) {
      console.log(decorateReport(commandHelp(parsed.command)));
      return 0;
    }
    switch (parsed.command) {
      case "version":
      case "--version":
      case "-v":
        console.log(`napplet ${cliMetadata.version}`);
        return 0;
      case "help":
      case "--help":
      case "-h":
        console.log(decorateReport(HELP));
        return 0;
      case "migrate":
        return await commandMigrate(parsed.rest);
      case "init":
        return await commandInit(parsed.rest);
      case "guide":
        return commandGuide();
      case "create":
        return await (options.runCreate ?? ((args) => runPackageCli("@napplet/boilerplate", args)))(
          canPrompt() ? parsed.rest : [...parsed.rest, "--yes"],
        );
      case "screenshot":
        return await (options.runScreenshot ?? ((args) => runPackageCli("@napplet/conformance-cli", args)))(parsed.rest);
      case "discover":
        return await commandDiscover(parsed.rest);
      case "deploy":
        return await commandDeploy(parsed.rest, options.runScreenshot);
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
    console.error(paint(error instanceof Error ? error.message : String(error), "error"));
    return error instanceof PromptCancelledError ? 130 : 1;
  }
}

function parseCommand(argv: string[]): ParsedArgs {
  if (argv.length === 0) return { command: "help", rest: [] };
  const [command, ...rest] = argv;
  return { command, rest };
}

async function commandDiscover(argv: string[]): Promise<number> {
  const flags = collectFlags(argv);
  const config = await loadProjectConfig(flags);
  const candidates = await discoverNapplets(config, { traverse: flags.boolean.has("all") });
  console.log(JSON.stringify(candidates, null, 2));
  return 0;
}

async function commandDebug(argv: string[]): Promise<number> {
  const flags = collectFlags(argv);
  // Debug emits JSON non-interactively: never prompt; reject bad values before config load.
  const format = await selectManifestFormat(first(flags.values.get("format")), false);
  const config = await loadProjectConfig(flags);
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
    format,
  });
  console.log(JSON.stringify(report, null, 2));
  if (report.manifests.error) {
    console.error(`Manifest templates could not be built: ${report.manifests.error}`);
  }
  return 0;
}

async function commandConformance(argv: string[]): Promise<number> {
  const flags = collectFlags(argv);
  const config = await loadProjectConfig(flags);
  const candidates = await discoverNapplets(config, { traverse: flags.boolean.has("all") });
  const base = await resolveConformanceCommand(config.conformance?.command);
  const passthrough = flags.afterDoubleDash;
  for (const candidate of candidates) {
    const result = await runCommand(base.command, [...base.args, candidate.dir, ...passthrough], { env: base.env });
    Deno.stdout.writeSync(new TextEncoder().encode(result.stdout));
    Deno.stderr.writeSync(new TextEncoder().encode(result.stderr));
    if (result.code !== 0) return result.code;
  }
  return 0;
}

async function commandPaja(argv: string[]): Promise<number> {
  const flags = collectFlags(argv);
  const config = await loadProjectConfig(flags);
  const configured = config.paja?.command?.trim();
  const base: ResolvedCommand = !configured || configured === "kehto"
    ? await managedPackageCommand("@kehto/cli@0.5.5", "dist/index.js")
    : splitCommand(configured);
  const child = new Deno.Command(base.command, {
    args: [...base.args, "paja", ...resolvePajaArgs(flags.afterDoubleDash)],
    env: { ...base.env, ...(!canPrompt() ? { CI: "true" } : {}) }, stdin: canPrompt() ? "inherit" : "null", stdout: "inherit", stderr: "inherit",
  }).spawn();
  return (await child.status).code;
}


if (import.meta.main) {
  Deno.exit(await main());
}
