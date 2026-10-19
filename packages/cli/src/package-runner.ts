/** Maintained package CLI adapters and argument normalization. */
import { type CommandRunner, runCommand, splitCommand } from "./process.ts";
import { managedPackageCommand } from "./managed-node.ts";

const CONFORMANCE_PACKAGE = "@napplet/conformance-cli@0.3.4";

/** Process and output adapters used to invoke a maintained package CLI. */
export interface PackageCliRunOptions {
  runner?: CommandRunner;
  writeStdout?: (value: string) => void;
  writeStderr?: (value: string) => void;
  os?: typeof Deno.build.os;
  resolvePackage?: typeof managedPackageCommand;
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
  const conformance = packageName === "@napplet/conformance-cli";
  const base = await (options.resolvePackage ?? managedPackageCommand)(
    conformance ? CONFORMANCE_PACKAGE : "@napplet/boilerplate@0.4.0", conformance ? "dist/cli.js" : "dist/index.js",
  );
  const result = await (options.runner ?? runCommand)(base.command,
    [...base.args, ...(conformance ? ["screenshot"] : []), ...args], { env: base.env });
  if (result.stdout) (options.writeStdout ?? console.log)(result.stdout.replace(/\n$/, ""));
  if (result.stderr) (options.writeStderr ?? console.error)(result.stderr.replace(/\n$/, ""));
  return result.code;
}

export interface ResolvedCommand {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

/** Resolve default conformance through private tooling; preserve explicit custom runners. */
export async function resolveConformanceCommand(
  configuredCommand: string | undefined,
  os: typeof Deno.build.os = Deno.build.os,
  resolvePackage = managedPackageCommand,
): Promise<ResolvedCommand> {
  const command = configuredCommand?.trim() || "napplet-conformance";
  if (command === "napplet-conformance") {
    return await resolvePackage(CONFORMANCE_PACKAGE, "dist/cli.js");
  }
  return splitCommand(command);
}

/** Preserve Kehto options while restoring the separator before a bare managed command. */
export function resolvePajaArgs(args: readonly string[]): string[] {
  if (args.length === 0 || args[0].startsWith("-") || args.includes("--")) return [...args];
  return ["--", ...args];
}
