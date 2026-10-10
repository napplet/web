/** Maintained package CLI adapters and argument normalization. */
import { type CommandRunner, runCommand, splitCommand } from "./process.ts";

// Pin the CLI contract: unversioned npx may select an incompatible local dependency.
const CONFORMANCE_PACKAGE = "@napplet/conformance-cli@0.3.3";

/** Process and output adapters used to invoke a maintained package CLI. */
export interface PackageCliRunOptions {
  runner?: CommandRunner;
  writeStdout?: (value: string) => void;
  writeStderr?: (value: string) => void;
  os?: typeof Deno.build.os;
}

/**
 * Run one maintained package CLI without interpreting user arguments as shell source.
 *
 * @param packageName Maintained npm package that owns the requested command.
 * @param args Arguments passed to the package CLI without shell interpolation.
 * @param options Process and output adapters, primarily for tests.
 * @returns Process exit code from the maintained package CLI.
 */
export async function runPackageCli(
  packageName: "@napplet/boilerplate" | "@napplet/conformance-cli",
  args: readonly string[],
  options: PackageCliRunOptions = {},
): Promise<number> {
  const executable = (options.os ?? Deno.build.os) === "windows" ? "npx.cmd" : "npx";
  let result;
  try {
    const commandArgs = packageName === "@napplet/conformance-cli"
      ? ["--yes", CONFORMANCE_PACKAGE, "screenshot", ...args]
      : ["--yes", packageName, ...args];
    result = await (options.runner ?? runCommand)(executable, commandArgs);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(
        `Cannot run ${packageName}: install Node.js 20+ so the bundled npm package runner is available.`,
      );
    }
    throw error;
  }
  if (result.stdout) (options.writeStdout ?? console.log)(result.stdout.replace(/\n$/, ""));
  if (result.stderr) (options.writeStderr ?? console.error)(result.stderr.replace(/\n$/, ""));
  return result.code;
}

export interface ResolvedCommand {
  command: string;
  args: string[];
}

/** Resolve the default conformance runner through npm instead of requiring a global binary. */
export function resolveConformanceCommand(
  configuredCommand: string | undefined,
  os: typeof Deno.build.os = Deno.build.os,
): ResolvedCommand {
  const command = configuredCommand?.trim() || "napplet-conformance";
  if (command === "napplet-conformance") {
    return {
      command: os === "windows" ? "npx.cmd" : "npx",
      args: ["--yes", CONFORMANCE_PACKAGE],
    };
  }
  return splitCommand(command);
}

/** Preserve Kehto options while restoring the separator before a bare managed command. */
export function resolvePajaArgs(args: readonly string[]): string[] {
  if (args.length === 0 || args[0].startsWith("-") || args.includes("--")) return [...args];
  return ["--", ...args];
}
