/** Complete deployment inputs before signing or publishing anything. */
import { writeConfig } from "./config.ts";
import { discoverNapplets } from "./discover.ts";
import { first, type FlagBag } from "./flags.ts";
import { canPrompt } from "./interaction.ts";
import { normalizeNamedDTags } from "./init-wizard.ts";
import { readManifestMetadataTags } from "./manifest-metadata.ts";
import type { ManifestFormat } from "./manifest-format.ts";
import { promptLine } from "./prompt.ts";
import { isAllowedUrl, parseUrlListInput } from "./url-prompt.ts";
import { resolveDeployServers } from "./deploy-network.ts";
import type { NappletCandidate, NappletConfig } from "./types.ts";
import { confirm } from "./command-prompts.ts";

export interface DeployInputOptions {
  interactive?: boolean;
  ask?: typeof promptLine;
  discover?: typeof discoverNapplets;
  save?: typeof writeConfig;
  print?: (line: string) => void;
}

/**
 * Recover missing artifact, metadata, and destination settings without replacing valid values.
 * @param original Existing configuration.
 * @param flags Invocation overrides.
 * @param format Selected event format.
 * @param options Prompt, discovery, and persistence hooks.
 * @returns Completed configuration, candidates, and per-artifact description overrides.
 * @example await completeDeployInputs(config, flags, "current")
 */
export async function completeDeployInputs(
  original: NappletConfig,
  flags: FlagBag,
  format: ManifestFormat,
  options: DeployInputOptions = {},
): Promise<{ config: NappletConfig; candidates: NappletCandidate[]; descriptions: Map<string, string> }> {
  const config = structuredClone(original);
  const interactive = !flags.boolean.has("non-interactive") && (options.interactive ?? canPrompt());
  const ask = options.ask ?? promptLine;
  const print = options.print ?? console.error;
  const missing: string[] = [];
  let prompted = false;
  const required = async (label: string, hint: string, validate: (value: string) => boolean = () => true) => {
    if (!interactive) { missing.push(hint); return ""; }
    prompted = true;
    for (;;) {
      const value = (await ask({ message: label })).trim();
      if (value && validate(value)) return value;
      print(`Enter a valid ${label.toLowerCase()}. Ctrl-C cancels.`);
    }
  };
  config.sourceDir = first(flags.values.get("source-dir")) ?? config.sourceDir;
  config.relays = flags.values.get("relay") ?? config.relays;
  config.blossomServers = flags.values.get("server") ?? config.blossomServers;
  const description = first(flags.values.get("description"));
  if (description) config.metadata = { ...config.metadata, description };
  const discover = options.discover ?? discoverNapplets;
  const discovery = { traverse: flags.boolean.has("all") };
  let candidates = await discover(config, discovery);
  while (candidates.length === 0) {
    if (!interactive) {
      missing.push(`No built index.html found in ${config.sourceDir}. Build the project or pass --source-dir <directory>.`);
      break;
    }
    print(`No built index.html found in ${config.sourceDir}. Choose the build directory.`);
    config.sourceDir = await required("Build directory", "--source-dir <directory>");
    if (discovery.traverse) config.discover = { ...config.discover, enabled: true, roots: [config.sourceDir] };
    // An explicit recovery path selects one build; do not keep searching stale monorepo roots.
    candidates = await discover(config, { traverse: false });
  }
  const tags = await Promise.all(candidates.map((candidate) =>
    readManifestMetadataTags(candidate.indexHtml, candidate.manifestPath, config, format)
  ));
  const descriptions = new Map<string, string>();
  if (format === "current") {
    for (let i = 0; i < candidates.length; i++) {
      if (tags[i].some((tag) => tag[0] === "description" && tag[1]?.trim())) continue;
      const value = await required(
        `Description for ${candidates.length === 1 ? config.metadata?.title ?? candidates[i].name : candidates[i].name}`,
        `Add metadata.description, an HTML description, or --description <text> (${candidates[i].name}).`,
      );
      if (value && candidates.length === 1) config.metadata = { ...config.metadata, description: value };
      else if (value) descriptions.set(candidates[i].dir, value);
    }
  }
  if (!flags.boolean.has("dry-run")) {
    if (!config.relays.length) {
      const value = await required("Relay URLs (comma separated)", "Add relays or pass --relay <ws(s)://url>.",
        (value) => parseUrlListInput(value).length > 0 && parseUrlListInput(value).every((url) => isAllowedUrl(url, ["ws:", "wss:"])));
      if (value) config.relays = [...new Set(parseUrlListInput(value))];
    }
    const embeddedServers = tags.flatMap((list) => list.filter((tag) => tag[0] === "server").map((tag) => tag[1]));
    if (!config.blossomServers.length && !embeddedServers.length) {
      const value = await required("Blossom server origins (comma separated)", "Add blossomServers or pass --server <http(s)://origin>.",
        (value) => validServers(parseUrlListInput(value)));
      if (value) config.blossomServers = [...new Set(parseUrlListInput(value))];
    }
  }
  if (interactive && candidates.length === 1 && !flags.boolean.has("all") &&
    config.defaultTarget === "named" && !config.named?.length && !candidates[0].publishingId &&
    !flags.values.has("name") && !flags.boolean.has("root") && !flags.boolean.has("snapshot")) {
    const name = await required("Publishing name", "--name <name>", (value) => {
      try { normalizeNamedDTags([value]); return true; } catch { return false; }
    });
    config.named = [name];
  }
  if (missing.length) {
    throw new Error(`Deployment needs configuration:\n${missing.map((line) => `  - ${line}`).join("\n")}\nRun without -i in a terminal for guided setup.`);
  }
  const appEnabled = !flags.boolean.has("no-zapstore") && (flags.boolean.has("zapstore") || config.zapstore?.enabled);
  if (appEnabled && !config.zapstore) {
    const id = await required("Zapstore application ID", "Add zapstore.id in config.");
    const name = await required("Zapstore display name", "Add zapstore.name in config.");
    if (!id || !name) throw new Error(`Application metadata needs configuration:\n${missing.map((line) => `  - ${line}`).join("\n")}`);
    config.zapstore = { id, name, enabled: true };
  }
  if (prompted && JSON.stringify(config) !== JSON.stringify(original)) {
    if (await confirm("Save these settings for next time?", true, ask)) {
      await (options.save ?? writeConfig)(config, first(flags.values.get("config")));
      print("Saved project settings.");
    }
  }
  if (descriptions.size) print("Per-napplet descriptions apply to this deploy. Add them to each HTML artifact to reuse them.");
  return { config, candidates, descriptions };
}

function validServers(values: string[]): boolean {
  try { resolveDeployServers([], values); return values.length > 0; } catch { return false; }
}
