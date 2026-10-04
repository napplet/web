/** File-based, offline migration preview; never signs or publishes events. */
import { collectFlags, first } from "./flags.ts";
import { migrateManifestEvent } from "./migrate.ts";

export async function commandMigrate(argv: string[]): Promise<number> {
  const flags = collectFlags(argv);
  const source = first(flags.values.get("input")) ?? flags.positional[0];
  if (!source) {
    throw new Error(
      "Usage: napplet migrate <signed-event.json> [--description <text>] [--optional <domain>] [--output <preview.json>]",
    );
  }
  const result = migrateManifestEvent(JSON.parse(await Deno.readTextFile(source)), {
    description: first(flags.values.get("description")),
    optional: flags.values.get("optional"),
  });
  const output = JSON.stringify(result, null, 2) + "\n";
  const path = first(flags.values.get("output"));
  if (path) await Deno.writeTextFile(path, output, { createNew: true });
  else console.log(output.trimEnd());
  return 0;
}
