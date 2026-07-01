#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env

import { initConfig, readConfig, setSigningKeyReference, writeConfig } from "./config.ts";
import { createDeployPlan } from "./deploy-plan.ts";
import { discoverNapplets } from "./discover.ts";
import { KEY_SERVICE_NAME, requireKeyStoreProvider } from "./key-store.ts";
import { runCommand, splitCommand } from "./process.ts";
import { resolveSigningMethod } from "./signing.ts";
import type { DeploySelection, NappletConfig } from "./types.ts";

const HELP = `@napplet/cli

Usage:
  napplet init [--force] [--source-dir <dir>] [--relay <url>] [--server <url>] [--name <dtag>]
  napplet deploy [--config <file>] [--all] [--root] [--name <dtag>] [--snapshot] [--sec <secret>] [--prompt-sec] [--dry-run]
  napplet keys store --name <ref> [--sec <secret> | --prompt-sec]
  napplet keys use --name <ref> [--config <file>]
  napplet keys list
  napplet keys delete --name <ref>
  napplet keys doctor
  napplet discover [--config <file>] [--all]
  napplet conformance [--config <file>] [--all] [-- <args>]
  napplet paja [--config <file>] [-- <args>]

Current scope:
  deploy creates and prints a deployment plan. Uploading and event signing are
  intentionally not enabled yet.
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
      case "keys":
        return await commandKeys(parsed.rest);
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

async function commandKeys(argv: string[]): Promise<number> {
  const subcommand = argv[0] ?? "help";
  const rest = argv.slice(1);
  const flags = collectFlags(rest);

  if (subcommand === "help" || subcommand === "--help" || subcommand === "-h") {
    console.log(HELP);
    return 0;
  }

  if (subcommand === "doctor") {
    const provider = await requireKeyStoreProvider();
    console.log(`Native key storage available: ${provider.name}`);
    return 0;
  }

  const provider = await requireKeyStoreProvider();

  if (subcommand === "store") {
    const name = requiredValue(flags, "name");
    const secret = await resolveSecretInput(flags);
    await provider.store({ service: KEY_SERVICE_NAME, account: name, secret });
    console.log(`Stored key reference "${name}" in ${provider.name}`);
    return 0;
  }

  if (subcommand === "list") {
    const accounts = await provider.list(KEY_SERVICE_NAME);
    if (accounts.length === 0) {
      console.log("No stored napplet keys");
      return 0;
    }
    for (const account of accounts) console.log(account);
    return 0;
  }

  if (subcommand === "use") {
    const name = requiredValue(flags, "name");
    const secret = await provider.retrieve(KEY_SERVICE_NAME, name);
    if (!secret) throw new Error(`No key reference "${name}" found in ${provider.name}`);
    const path = first(flags.values.get("config"));
    const config = await readConfig(path);
    if (!config) throw new Error(`No .napplet config found${path ? ` at ${path}` : ""}`);
    await writeConfig(setSigningKeyReference(config, name), path);
    console.log(`Configured .napplet signing.keyReference = "${name}"`);
    return 0;
  }

  if (subcommand === "delete") {
    const name = requiredValue(flags, "name");
    const deleted = await provider.delete(KEY_SERVICE_NAME, name);
    console.log(deleted ? `Deleted key reference "${name}"` : `No key reference "${name}" found`);
    return deleted ? 0 : 1;
  }

  console.error(`Unknown keys subcommand: ${subcommand}`);
  return 2;
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
    if (
      ["force", "all", "root", "snapshot", "prompt-sec", "dry-run"].includes(name)
    ) {
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

function requiredValue(flags: FlagBag, name: string): string {
  const value = first(flags.values.get(name));
  if (!value) throw new Error(`Missing --${name}`);
  return value;
}

async function resolveSecretInput(flags: FlagBag): Promise<string> {
  const sec = first(flags.values.get("sec"));
  if (sec) return sec;
  if (!flags.boolean.has("prompt-sec")) {
    throw new Error("Provide --sec <secret> or --prompt-sec");
  }
  return await readSecretFromStdin();
}

async function readSecretFromStdin(): Promise<string> {
  console.error("Enter signing secret, then press Ctrl-D:");
  const chunks: Uint8Array[] = [];
  for await (const chunk of Deno.stdin.readable) chunks.push(chunk);
  const size = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const all = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.length;
  }
  const secret = new TextDecoder().decode(all).trim();
  if (!secret) throw new Error("No secret provided on stdin");
  return secret;
}

if (import.meta.main) {
  Deno.exit(await main());
}
