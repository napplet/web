/**
 * Terminal prompt helpers for CLI input.
 *
 * @module
 */
import { currentInteraction } from "./interaction.ts";
import { paint } from "./terminal.ts";

/** Cancellation restores terminal state and maps to exit code 130 in the dispatcher. */
export class PromptCancelledError extends Error {
  constructor() { super("Prompt cancelled"); }
}

export interface PromptInput {
  readonly readable?: ReadableStream<Uint8Array>;
  isTerminal?: () => boolean;
  read?: (buffer: Uint8Array) => Promise<number | null>;
  setRaw?: (mode: boolean, options?: { cbreak: boolean }) => void;
}

export interface PromptOutput {
  writeSync(bytes: Uint8Array): number;
}

export interface SecretPromptOptions {
  message?: string;
  input?: PromptInput;
  output?: PromptOutput;
}

export interface LinePromptOptions {
  message: string;
  defaultValue?: string;
  /** Candidate values used for Tab completion. They are not printed as a menu. */
  suggestions?: readonly string[];
  input?: PromptInput;
  output?: PromptOutput;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Backward-compatible alias for callers that name secret prompt IO explicitly. */
export type SecretPromptInput = PromptInput;
/** Backward-compatible alias for callers that name secret prompt IO explicitly. */
export type SecretPromptOutput = PromptOutput;

/**
 * Read a secret from the terminal without echoing input.
 *
 * TTY input finishes on Enter. Non-TTY input falls back to reading piped stdin
 * until EOF so CI can still pass secrets without an interactive prompt.
 *
 * @param options Prompt message and injectable IO used by tests.
 * @returns Trimmed secret string.
 * @example
 * ```ts
 * const secret = await promptSecret();
 * ```
 */
export async function promptSecret(options: SecretPromptOptions = {}): Promise<string> {
  const input = options.input ?? Deno.stdin;
  const output = options.output ?? Deno.stderr;
  const message = options.message ?? "Enter signing secret (input hidden), then press Enter: ";
  const isTerminal = input.isTerminal?.() ?? false;
  if (isTerminal && currentInteraction()?.interactive === false) {
    throw new Error("Prompts are disabled. Provide --sec or NAPPLET_CI_SIGNING_KEY; pipe a secret only with --prompt-sec.");
  }
  if (isTerminal && input.read && input.setRaw) {
    return finalizeSecret(await readBytesFromTerminal(input, output, message, false, []));
  }
  return await readSecretFromReadable(input.readable ?? Deno.stdin.readable);
}

/**
 * Read one line from the terminal, echoing typed characters.
 *
 * @param options Prompt message, default value, suggestions, and injectable IO.
 * @returns Trimmed input, or the default value when the user presses Enter.
 * @example
 * ```ts
 * const sourceDir = await promptLine({ message: "Source directory", defaultValue: "." });
 * ```
 */
export async function promptLine(options: LinePromptOptions): Promise<string> {
  if (currentInteraction()?.interactive === false) {
    throw new Error("Prompts are disabled. Supply the missing value with a flag or in .napplet/config.yaml.");
  }
  const input = options.input ?? Deno.stdin;
  const output = options.output ?? Deno.stderr;
  const message = formatPromptMessage(options.message, options.defaultValue);
  const suggestions = options.suggestions ?? [];
  const isTerminal = input.isTerminal?.() ?? false;
  const line = isTerminal && input.read && input.setRaw
    ? decoder.decode(
      new Uint8Array(await readBytesFromTerminal(input, output, message, true, suggestions)),
    )
      .trim()
    : await readLineFromReadable(input.readable ?? Deno.stdin.readable);
  return line === "" && options.defaultValue !== undefined ? options.defaultValue : line;
}

/**
 * Return whether an input source is an interactive terminal.
 *
 * @param input File-like input source.
 * @returns True when the source reports a terminal.
 * @example
 * ```ts
 * isTerminalInput(Deno.stdin);
 * ```
 */
export function isTerminalInput(input: { isTerminal?: () => boolean } = Deno.stdin): boolean {
  try {
    return input.isTerminal?.() ?? false;
  } catch {
    return false;
  }
}

async function readBytesFromTerminal(
  input: PromptInput,
  output: PromptOutput,
  message: string,
  echo: boolean,
  suggestions: readonly string[],
): Promise<number[]> {
  const bytes: number[] = [];
  const buffer = new Uint8Array(1);
  input.setRaw?.(true, { cbreak: false });
  try {
    output.writeSync(encoder.encode(message));
    for (;;) {
      const read = await input.read?.(buffer);
      if (read === null || read === undefined) throw new PromptCancelledError();
      for (let i = 0; i < read; i += 1) {
        const byte = buffer[i];
        if (byte === 3 || byte === 4) throw new PromptCancelledError();
        if (byte === 10 || byte === 13) {
          output.writeSync(encoder.encode("\n"));
          return bytes;
        }
        if (byte === 8 || byte === 127) {
          if (bytes.length > 0) {
            let removed = bytes.pop()!;
            while ((removed & 0xc0) === 0x80 && bytes.length) removed = bytes.pop()!;
            if (echo) output.writeSync(encoder.encode("\b \b"));
          }
          continue;
        }
        if (byte === 9 && echo) {
          const completion = completeSuggestion(bytes, suggestions);
          if (completion) {
            bytes.splice(0, bytes.length, ...completion.bytes);
            output.writeSync(encoder.encode(completion.appended));
          }
          continue;
        }
        if (byte >= 32) {
          bytes.push(byte);
          if (echo) output.writeSync(new Uint8Array([byte]));
        }
      }
    }
  } finally {
    input.setRaw?.(false);
  }
}

async function readSecretFromReadable(source: ReadableStream<Uint8Array>): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of source) chunks.push(chunk);
  const size = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const all = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.length;
  }
  return finalizeSecret([...all]);
}

async function readLineFromReadable(source: ReadableStream<Uint8Array>): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of source) chunks.push(chunk);
  const size = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const all = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.length;
  }
  return decoder.decode(all).split(/\r?\n/, 1)[0].trim();
}

function finalizeSecret(bytes: readonly number[]): string {
  const secret = decoder.decode(new Uint8Array(bytes)).trim();
  if (!secret) throw new Error("No secret provided on stdin");
  return secret;
}

function formatPromptMessage(message: string, defaultValue: string | undefined): string {
  const label = paint(`? ${message}`, "accent");
  return defaultValue === undefined ? `${label}: ` : `${label} ${paint(`[${defaultValue}]`, "muted")}: `;
}

function completeSuggestion(
  bytes: readonly number[],
  suggestions: readonly string[],
): { bytes: number[]; appended: string } | null {
  if (suggestions.length === 0 || bytes.length === 0) return null;
  const current = decoder.decode(new Uint8Array(bytes));
  const tokenStart = current.lastIndexOf(",") + 1;
  const leading = current.slice(tokenStart).match(/^\s*/)?.[0] ?? "";
  const prefixStart = tokenStart + leading.length;
  const prefix = current.slice(prefixStart);
  if (!prefix) return null;

  const match = suggestions.find((suggestion) => suggestion.startsWith(prefix));
  if (!match || match === prefix) return null;

  const completed = `${current.slice(0, prefixStart)}${match}`;
  return {
    bytes: [...encoder.encode(completed)],
    appended: completed.slice(current.length),
  };
}
