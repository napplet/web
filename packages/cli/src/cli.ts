#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env

import { initConfig, readConfig } from "./config.ts";
import { createDeployPlan } from "./deploy-plan.ts";
import { discoverNapplets } from "./discover.ts";
import { runCommand, splitCommand } from "./process.ts";
import { resolveSigningMethod } from "./signing.ts";
import type { DeploySelection, NappletConfig } from "./types.ts";

const HELP = `@napplet/cli

Usage:
  napplet init [--force] [--source-dir <dir>] [--relay <url>] [--server <url>] [--name <dtag>]
  napplet deploy [--config <file>] [--all] [--root] [--name <dtag>] [--snapshot] [--sec <secret>] [--prompt-sec] [--dry-run]
  napplet discover [--config <file>] [--all]
  napplet conformance [--config <file>] [--all] [-- <args>]
  napplet paja [--config <file>] [-- <args>]

Current scope:
  deploy creates and prints a deployment plan. Uploading, event signing, and
  platform keychain storage are intentionally not enabled in this first slice.
`;

interface ParsedArgs {
  command: string;
  rest: string[];
}

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
  const result = await initConfig({
    force: flags.boolean.has("force"),
    sourceDir: first(flags.values.get("source-dir")),
    relays: flags.values.get("relay") ?? [],
    blossomServers: flags.values.get("server") ?? [],
    named: flags.values.get("name") ?? [],
  });
  console.log(`${result.created ? "Created" : "Found"} ${result.path}`);
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
  });

  if (!flags.boolean.has("dry-run")) {
    throw new Error(
      "Network deploy is not implemented yet. Re-run with --dry-run to inspect the plan.",
    );
  }

  console.log(JSON.stringify({ signing, plan }, null, 2));
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

interface FlagBag {
  boolean: Set<string>;
  values: Map<string, string[]>;
  positional: string[];
  afterDoubleDash: string[];
}

function collectFlags(argv: string[]): FlagBag {
  const flags: FlagBag = {
    boolean: new Set(),
    values: new Map(),
    positional: [],
    afterDoubleDash: [],
  };
  let passthrough = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (passthrough) {
      flags.afterDoubleDash.push(arg);
      continue;
    }
    if (arg === "--") {
      passthrough = true;
      continue;
    }
    if (!arg.startsWith("--")) {
      flags.positional.push(arg);
      continue;
    }
    const name = arg.slice(2);
    if (["force", "all", "root", "snapshot", "prompt-sec", "dry-run"].includes(name)) {
      flags.boolean.add(name);
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
    i += 1;
    const values = flags.values.get(name) ?? [];
    values.push(value);
    flags.values.set(name, values);
  }
  return flags;
}

function first(values: string[] | undefined): string | undefined {
  return values?.[0];
}

if (import.meta.main) {
  Deno.exit(await main());
}
