/**
 * Interactive init wizard helpers.
 *
 * @module
 */

import { NAMED_SITE_D_TAG_PATTERN } from "./manifest.ts";
import { type PromptInput, promptLine, type PromptOutput } from "./prompt.ts";
import type { DeployTargetKind } from "./types.ts";

export interface InitWizardSeed {
  sourceDir?: string;
  relays: string[];
  blossomServers: string[];
  named: string[];
  root: boolean;
}

export interface InitWizardSuggestions {
  relays: string[];
  blossomServers: string[];
}

export interface InitWizardResult {
  sourceDir: string;
  relays: string[];
  blossomServers: string[];
  named: string[];
  defaultTarget: DeployTargetKind;
}

export interface InitWizardOptions {
  seed: InitWizardSeed;
  suggestions: InitWizardSuggestions;
  input?: PromptInput;
  output?: PromptOutput;
}

/**
 * Prompt for missing init config fields.
 *
 * @param options Seed values, suggestions, and injectable IO.
 * @returns Complete init config options.
 * @example
 * ```ts
 * const init = await promptInitWizard({ seed, suggestions });
 * ```
 */
export async function promptInitWizard(options: InitWizardOptions): Promise<InitWizardResult> {
  const sourceDir = options.seed.sourceDir ?? await promptLine({
    message: "Source directory",
    defaultValue: ".",
    input: options.input,
    output: options.output,
  });

  const defaultTarget = await promptDefaultTarget(options);
  const named = defaultTarget === "named" ? await promptNamedDTags(options) : [];
  const relays = options.seed.relays.length > 0 ? unique(options.seed.relays) : await promptUrls({
    message: "Relay URLs",
    suggestions: options.suggestions.relays,
    allowedProtocols: ["wss:", "ws:"],
    input: options.input,
    output: options.output,
  });
  const blossomServers = options.seed.blossomServers.length > 0
    ? unique(options.seed.blossomServers)
    : await promptUrls({
      message: "Blossom server URLs",
      suggestions: options.suggestions.blossomServers,
      allowedProtocols: ["https:", "http:"],
      input: options.input,
      output: options.output,
    });

  return {
    sourceDir,
    relays,
    blossomServers,
    named,
    defaultTarget,
  };
}

async function promptDefaultTarget(options: InitWizardOptions): Promise<DeployTargetKind> {
  if (options.seed.root) return "root";
  if (options.seed.named.length > 0) return "named";
  for (;;) {
    const value = await promptLine({
      message: "Default publish target (named/root)",
      defaultValue: "named",
      suggestions: ["named", "root"],
      input: options.input,
      output: options.output,
    });
    const normalized = value.trim().toLowerCase();
    if (normalized === "named" || normalized === "root") return normalized;
    writeLine(options.output, "Enter either named or root.");
  }
}

async function promptNamedDTags(options: InitWizardOptions): Promise<string[]> {
  if (options.seed.named.length > 0) return normalizeNamedDTags(options.seed.named);
  for (;;) {
    const value = await promptLine({
      message: "Named napplet d tag",
      defaultValue: "default",
      input: options.input,
      output: options.output,
    });
    try {
      return normalizeNamedDTags(splitEntries(value));
    } catch (error) {
      writeLine(options.output, error instanceof Error ? error.message : String(error));
    }
  }
}

async function promptUrls(options: {
  message: string;
  suggestions: string[];
  allowedProtocols: readonly string[];
  input?: PromptInput;
  output?: PromptOutput;
}): Promise<string[]> {
  const urls: string[] = [];
  for (;;) {
    const value = await promptLine({
      message: `${options.message} (comma-separated, numbers from suggestions, blank when done)`,
      suggestions: urls.length === 0 ? options.suggestions : [],
      input: options.input,
      output: options.output,
    });
    if (value.trim() === "") return urls;
    for (const entry of splitEntries(value)) {
      const resolved = resolveSuggestion(entry, options.suggestions);
      if (!isAllowedUrl(resolved, options.allowedProtocols)) {
        writeLine(
          options.output,
          `Skipping invalid URL "${entry}". Include ${options.allowedProtocols.join(" or ")}.`,
        );
        continue;
      }
      if (!urls.includes(resolved)) urls.push(resolved);
    }
  }
}

export function normalizeNamedDTags(values: readonly string[]): string[] {
  const normalized = unique(values.map((value) => value.trim()).filter(Boolean));
  if (normalized.length === 0) throw new Error("At least one named d tag is required.");
  for (const value of normalized) {
    if (!NAMED_SITE_D_TAG_PATTERN.test(value) || value.endsWith("-")) {
      throw new Error(
        `Named napplet d tag "${value}" must match ^[a-z0-9-]{1,13}$ and not end with '-'.`,
      );
    }
  }
  return normalized;
}

function resolveSuggestion(value: string, suggestions: readonly string[]): string {
  const index = Number(value);
  if (Number.isInteger(index) && index >= 1 && index <= suggestions.length) {
    return suggestions[index - 1];
  }
  return value;
}

function isAllowedUrl(value: string, allowedProtocols: readonly string[]): boolean {
  try {
    return allowedProtocols.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function splitEntries(value: string): string[] {
  return value.split(/[,\s]+/).map((entry) => entry.trim()).filter(Boolean);
}

function unique(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function writeLine(output: PromptOutput | undefined, value: string): void {
  const target = output ?? Deno.stderr;
  target.writeSync(new TextEncoder().encode(`${value}\n`));
}
