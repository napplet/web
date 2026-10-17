/** Parse command arguments and gate config-consuming commands on migration consent. */
import { canPromptForConfigMigration, migrateConfig, type ConfigMigrationOptions } from "./config-migration.ts";
import { collectFlags, first } from "./flags.ts";

interface ParsedArgs {
  command: string;
  rest: string[];
}

/** Prepare a command before any command-specific side effects.
 * @param argv Command-line arguments.
 * @param options Migration approval and terminal I/O.
 * @returns Parsed arguments with the migrated configuration path.
 * @example await prepareCommand(["init", "--migrate-config"])
 */
export async function prepareCommand(argv: string[], options?: ConfigMigrationOptions): Promise<ParsedArgs> {
  const parsed = parseCommand(argv);
  await migrateCommandConfig(parsed, options);
  return parsed;
}

function parseCommand(argv: string[]): ParsedArgs {
  if (argv.length === 0) return { command: "help", rest: [] };
  let index = 0;
  while (["-i", "--non-interactive", "--migrate-config"].includes(argv[index])) index++;
  const command = argv[index] ?? "help";
  const leading = argv.slice(0, index);
  const rest = argv.slice(index + 1);
  return {
    command,
    rest: command === "keys"
      ? [rest[0] ?? "help", ...leading, ...rest.slice(1)]
      : [...leading, ...rest],
  };
}

async function migrateCommandConfig(parsed: ParsedArgs, options: ConfigMigrationOptions = {}): Promise<void> {
  if (!["init", "deploy", "debug", "discover", "keys", "conformance", "paja"].includes(parsed.command)) return;
  if (parsed.command === "keys" && ["help", "--help", "-h"].includes(parsed.rest[0] ?? "help")) return;
  const flags = collectFlags(parsed.rest);
  const requested = first(flags.values.get("config"));
  const path = await migrateConfig(requested, {
    ...options,
    approve: flags.boolean.has("migrate-config") || options.approve,
    interactive: !flags.boolean.has("non-interactive") && !flags.boolean.has("json") &&
      (options.interactive ?? canPromptForConfigMigration()),
  });
  if (requested) parsed.rest[parsed.rest.indexOf("--config") + 1] = path;
}
