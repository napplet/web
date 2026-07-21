/**
 * Shared command-line flag parsing helpers.
 *
 * @module
 */

import { promptSecret } from "./prompt.ts";

export interface FlagBag {
  boolean: Set<string>;
  values: Map<string, string[]>;
  positional: string[];
  afterDoubleDash: string[];
}

/** Parse `--flag value`, boolean flags, positional args, and `--` passthrough. */
export function collectFlags(argv: string[]): FlagBag {
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
    if (["force", "all", "root", "snapshot", "prompt-sec", "dry-run", "json"].includes(name)) {
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

export function first(values: string[] | undefined): string | undefined {
  return values?.[0];
}

export function requiredValue(flags: FlagBag, name: string): string {
  const value = first(flags.values.get(name));
  if (!value) throw new Error(`Missing --${name}`);
  return value;
}

export async function resolveSecretInput(flags: FlagBag): Promise<string> {
  const sec = first(flags.values.get("sec"));
  if (sec) return sec;
  if (!flags.boolean.has("prompt-sec")) {
    throw new Error("Provide --sec <secret> or --prompt-sec");
  }
  return await promptSecret();
}
