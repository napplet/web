/**
 * Interactive init wizard helpers.
 *
 * @module
 */

import { NAMED_SITE_D_TAG_PATTERN } from "./manifest.ts";
import { parseArchetypeConventions } from "./config.ts";
import { type PromptInput, promptLine, type PromptOutput } from "./prompt.ts";
import type { DeployTargetKind, NappletArchetypeConvention } from "./types.ts";
import { promptUrlList, unique } from "./url-prompt.ts";

export interface InitWizardSeed {
  sourceDir?: string;
  relays: string[];
  blossomServers: string[];
  named: string[];
  title?: string;
  description?: string;
  archetypes: string[];
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
  title?: string;
  description?: string;
  archetypes: NappletArchetypeConvention[];
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
  const name = named[0];
  const title = options.seed.title ?? await promptLine({
    message: "Human-readable title",
    defaultValue: name ? titleFromName(name) : "My Napplet",
    input: options.input,
    output: options.output,
  });
  const description = options.seed.description ?? await promptLine({
    message: "Description (optional)",
    input: options.input,
    output: options.output,
  });
  const archetypes = options.seed.archetypes.length > 0
    ? parseArchetypeConventions(options.seed.archetypes)
    : await promptArchetypes(options);
  const relays = options.seed.relays.length > 0
    ? unique(options.seed.relays)
    : await promptUrlList({
      message: "Relay URLs",
      suggestions: options.suggestions.relays,
      allowedProtocols: ["wss:", "ws:"],
      input: options.input,
      output: options.output,
    });
  const blossomServers = options.seed.blossomServers.length > 0
    ? unique(options.seed.blossomServers)
    : await promptUrlList({
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
    title: title.trim() || undefined,
    description: description.trim() || undefined,
    archetypes,
    defaultTarget,
  };
}

async function promptArchetypes(options: InitWizardOptions): Promise<NappletArchetypeConvention[]> {
  for (;;) {
    const value = await promptLine({
      message: "Archetype conventions (slug:napplet:<archetype>/<intent>, comma separated, optional)",
      input: options.input,
      output: options.output,
    });
    if (value.trim() === "") return [];
    try {
      return parseArchetypeConventions(splitEntries(value));
    } catch (error) {
      writeLine(options.output, error instanceof Error ? error.message : String(error));
    }
  }
}

export function titleFromName(value: string): string {
  return value.split("-").filter(Boolean).map((part) =>
    `${part.charAt(0).toUpperCase()}${part.slice(1)}`
  ).join(" ") || "My Napplet";
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

function splitEntries(value: string): string[] {
  return value.split(/[,\s]+/).map((entry) => entry.trim()).filter(Boolean);
}

function writeLine(output: PromptOutput | undefined, value: string): void {
  const target = output ?? Deno.stderr;
  target.writeSync(new TextEncoder().encode(`${value}\n`));
}
