/** Deno workspace entry point for the built boilerplate CLI. */
// @ts-nocheck -- the Node-oriented implementation is checked by the package's TypeScript build.
import { runCli as runNodeCli } from "./index.ts";
export async function runCli(argv: string[]): Promise<number> {
  return await runNodeCli(argv);
}
