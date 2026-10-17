/** Validated command prompts, shared by configuration and credential workflows. */
import { promptLine, type LinePromptOptions } from "./prompt.ts";
import { paint } from "./terminal.ts";

/**
 * Read a non-empty value, retrying invalid terminal input.
 * @param options Prompt details and optional validation.
 * @returns Accepted text.
 * @example await promptRequired({ message: "Publishing name" })
 */
export async function promptRequired(options: LinePromptOptions & {
  validate?: (value: string) => boolean;
}): Promise<string> {
  for (;;) {
    const value = await promptLine(options);
    if (value && (!options.validate || options.validate(value))) return value;
    const message = paint("Enter a valid value. Ctrl-C cancels.\n", "warning");
    (options.output ?? Deno.stderr).writeSync(new TextEncoder().encode(message));
  }
}

/**
 * Ask a yes/no question without treating typos as consent or refusal.
 * @param message Question text.
 * @param defaultValue Default answer.
 * @param ask Injectable line prompt.
 * @returns True only for yes/y.
 * @example await confirm("Save project settings?", true)
 */
export async function confirm(message: string, defaultValue = false, ask = promptLine): Promise<boolean> {
  for (;;) {
    const value = (await ask({ message: `${message} (yes/no)`, defaultValue: defaultValue ? "yes" : "no" })).toLowerCase();
    if (["yes", "y"].includes(value)) return true;
    if (["no", "n"].includes(value)) return false;
    console.error(paint("Enter yes or no. Ctrl-C cancels.", "warning"));
  }
}

/**
 * Select a named choice with a visible menu and a default.
 * @param message Menu title.
 * @param choices Allowed names and explanations.
 * @param defaultValue Default choice name.
 * @returns Selected name.
 * @example await choose("Signer", { connect: "Use a remote signer", secret: "Enter a secret" }, "connect")
 */
export async function choose<const T extends Record<string, string>>(message: string, choices: T, defaultValue: keyof T & string): Promise<keyof T & string> {
  console.error(paint(`\n${message}`, "heading"));
  for (const [name, description] of Object.entries(choices)) console.error(`  ${paint(name, "accent")}  ${description}`);
  for (;;) {
    const value = await promptLine({ message: "Choose", defaultValue, suggestions: Object.keys(choices) });
    if (Object.hasOwn(choices, value)) return value as keyof T & string;
    console.error(`Choose ${Object.keys(choices).join(", ")}. Ctrl-C cancels.`);
  }
}
