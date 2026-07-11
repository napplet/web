/**
 * Nostr Connect bunker relay prompt helpers.
 *
 * @module
 */

import { DEFAULT_CONNECT_RELAYS } from "./nostr-connect.ts";
import { type PromptInput, promptLine, type PromptOutput } from "./prompt.ts";
import { isAllowedUrl, parseUrlListInput, unique } from "./url-prompt.ts";

export interface BunkerRelayPromptOptions {
  defaults?: readonly string[];
  promptConnectRelays?: (defaults: readonly string[]) => Promise<string[]>;
  input?: PromptInput;
  output?: PromptOutput;
  print?: (line: string) => void;
}

/**
 * Resolve the default bunker relays for Nostr Connect.
 *
 * @param preferredRelays Stored bunker-session relays, when available.
 * @returns Unique bunker relay defaults.
 * @example
 * ```ts
 * bunkerRelayDefaults(); // ["wss://bucket.coracle.social"]
 * ```
 */
export function bunkerRelayDefaults(preferredRelays?: readonly string[]): string[] {
  return unique(
    preferredRelays && preferredRelays.length > 0 ? preferredRelays : DEFAULT_CONNECT_RELAYS,
  );
}

/**
 * Prompt for Nostr Connect bunker relays before rendering a QR code.
 *
 * @param options Prompt defaults, injectable IO, and optional test hook.
 * @returns One or more validated ws/wss relay URLs.
 * @example
 * ```ts
 * const relays = await promptBunkerRelays();
 * ```
 */
export async function promptBunkerRelays(
  options: BunkerRelayPromptOptions = {},
): Promise<string[]> {
  const defaults = bunkerRelayDefaults(options.defaults);
  if (options.promptConnectRelays) {
    const relays = normalizeBunkerRelays(await options.promptConnectRelays(defaults), options);
    if (relays.length === 0) throw new Error("At least one bunker relay is required.");
    return relays;
  }

  for (;;) {
    const value = await promptLine({
      message: "Bunker connection relays",
      defaultValue: defaults.join(", "),
      suggestions: unique([...defaults, ...DEFAULT_CONNECT_RELAYS]),
      input: options.input,
      output: options.output,
    });
    const relays = normalizeBunkerRelays(parseUrlListInput(value), options);
    if (relays.length > 0) return relays;
    const print = options.print ?? console.error;
    print("Enter at least one ws:// or wss:// bunker relay.");
  }
}

/**
 * Validate and deduplicate bunker relays.
 *
 * @param values Candidate relay URLs.
 * @param options Optional printer for invalid candidates.
 * @returns Unique valid ws/wss relay URLs.
 * @example
 * ```ts
 * normalizeBunkerRelays(["wss://relay.example"]); // ["wss://relay.example"]
 * ```
 */
export function normalizeBunkerRelays(
  values: readonly string[],
  options: Pick<BunkerRelayPromptOptions, "print"> = {},
): string[] {
  const print = options.print ?? console.error;
  const relays: string[] = [];
  for (const value of unique(values)) {
    if (!isAllowedUrl(value, ["wss:", "ws:"])) {
      print(`Skipping invalid bunker relay "${value}". Include wss:// or ws://.`);
      continue;
    }
    relays.push(value);
  }
  return relays;
}
