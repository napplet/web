/**
 * URL prompt helpers for interactive CLI flows.
 *
 * @module
 */

import { type PromptInput, promptLine, type PromptOutput } from "./prompt.ts";

export interface UrlListPromptOptions {
  message: string;
  suggestions?: readonly string[];
  allowedProtocols: readonly string[];
  input?: PromptInput;
  output?: PromptOutput;
}

/**
 * Prompt for a list of URLs, one prompt line at a time.
 *
 * Suggestions are used for Tab completion. A blank line finishes the list.
 *
 * @param options Prompt message, completion candidates, allowed protocols, and optional IO.
 * @returns Unique URL list in the order entered.
 * @example
 * ```ts
 * await promptUrlList({ message: "Relay URL", allowedProtocols: ["wss:"] });
 * ```
 */
export async function promptUrlList(options: UrlListPromptOptions): Promise<string[]> {
  const urls: string[] = [];
  for (;;) {
    const value = await promptLine({
      message: `${options.message} (Tab to autocomplete, blank when done)`,
      suggestions: options.suggestions ?? [],
      input: options.input,
      output: options.output,
    });
    if (value.trim() === "") return urls;
    const accepted = appendValidUrls({
      values: parseUrlListInput(value),
      urls,
      allowedProtocols: options.allowedProtocols,
      output: options.output,
    });
    for (const url of accepted) urls.push(url);
  }
}

/**
 * Split a relay/server prompt value into URL entries.
 *
 * @param value Raw prompt value.
 * @returns Trimmed URL entries.
 * @example
 * ```ts
 * parseUrlListInput("wss://a, wss://b"); // ["wss://a", "wss://b"]
 * ```
 */
export function parseUrlListInput(value: string): string[] {
  return value.split(/[,\s]+/).map((entry) => entry.trim()).filter(Boolean);
}

/**
 * Check whether a URL uses one of the allowed protocols.
 *
 * @param value Candidate URL.
 * @param allowedProtocols Protocol allowlist including trailing colons.
 * @returns True when the URL parses and uses an allowed protocol.
 * @example
 * ```ts
 * isAllowedUrl("wss://relay.example", ["wss:"]); // true
 * ```
 */
export function isAllowedUrl(value: string, allowedProtocols: readonly string[]): boolean {
  try {
    return allowedProtocols.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

/**
 * Return unique values in their original order.
 *
 * @param values Values to deduplicate.
 * @returns Unique values.
 * @example
 * ```ts
 * unique(["a", "a", "b"]); // ["a", "b"]
 * ```
 */
export function unique(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function appendValidUrls(options: {
  values: readonly string[];
  urls: readonly string[];
  allowedProtocols: readonly string[];
  output?: PromptOutput;
}): string[] {
  const accepted: string[] = [];
  for (const value of options.values) {
    if (!isAllowedUrl(value, options.allowedProtocols)) {
      writeLine(
        options.output,
        `Skipping invalid URL "${value}". Include ${options.allowedProtocols.join(" or ")}.`,
      );
      continue;
    }
    if (options.urls.includes(value) || accepted.includes(value)) continue;
    accepted.push(value);
  }
  return accepted;
}

function writeLine(output: PromptOutput | undefined, value: string): void {
  const target = output ?? Deno.stderr;
  target.writeSync(new TextEncoder().encode(`${value}\n`));
}
