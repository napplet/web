/** Per-invocation interaction policy, shared by command and nested credential prompts. */
import { AsyncLocalStorage } from "node:async_hooks";

export interface InteractionPolicy {
  interactive: boolean;
  color: boolean;
}

const invocation = new AsyncLocalStorage<InteractionPolicy>();

/**
 * Decide whether a terminal session may ask for input.
 * @param options Explicit switches, terminal state and environment.
 * @returns False for automation, redirected streams, or an explicit opt-out.
 * @example resolveInteraction({ nonInteractive: true }).interactive // false
 */
export function resolveInteraction(options: {
  nonInteractive?: boolean;
  json?: boolean;
  noColor?: boolean;
  inputTerminal?: boolean;
  outputTerminal?: boolean;
  env?: Record<string, string | undefined>;
} = {}): InteractionPolicy {
  const env = options.env ?? Deno.env.toObject();
  const input = options.inputTerminal ?? Deno.stdin.isTerminal();
  const output = options.outputTerminal ?? Deno.stdout.isTerminal();
  const ci = Boolean(env.CI && !["0", "false"].includes(env.CI.toLowerCase()));
  return {
    interactive: input && output && !ci && !options.nonInteractive && !options.json,
    color: output && !options.json && !options.noColor && env.NO_COLOR === undefined &&
      env.TERM !== "dumb",
  };
}

/**
 * Scope prompt and color decisions to one invocation, including nested async calls.
 * @param policy Resolved terminal behavior.
 * @param run Command to execute.
 * @returns The command's result.
 * @example withInteraction({ interactive: false, color: false }, () => main(args))
 */
export function withInteraction<T>(policy: InteractionPolicy, run: () => T): T {
  return invocation.run(policy, run);
}

/**
 * Read the active invocation policy, if the caller is inside the CLI dispatcher.
 * @returns Scoped policy or undefined for library consumers.
 * @example currentInteraction()?.interactive
 */
export function currentInteraction(): InteractionPolicy | undefined {
  return invocation.getStore();
}

/**
 * Check whether command-level prompts may run.
 * @returns The invocation decision, or the detected terminal policy.
 * @example if (canPrompt()) await promptLine({ message: "Project name" });
 */
export function canPrompt(): boolean {
  return (currentInteraction() ?? resolveInteraction()).interactive;
}
