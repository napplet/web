#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env --allow-net

/**
 * Standalone release-binary entrypoint.
 *
 * This file is excluded from the JSR package. Release compilation resolves and
 * embeds the maintained workspace package CLI so create needs no Node.js
 * process or package resolver at runtime. Agent skills are installed with the
 * skills.sh CLI (`npx skills add napplet/napplet`), not by this binary.
 */

import { runCli as runBoilerplateCli } from "@napplet/boilerplate";
import { main } from "./cli.ts";

if (import.meta.main) {
  Deno.exit(
    await main(Deno.args, {
      runCreate: (args) => runBoilerplateCli([...args]),
    }),
  );
}
