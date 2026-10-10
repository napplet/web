/** Opt-in npm resolution regression; downloads the pinned public runner if uncached. */
import { runPackageCli, resolveConformanceCommand } from "../src/package-runner.ts";
import { runCommand } from "../src/process.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

Deno.test({
  name: "npm selects the compatible runner despite an older project-local binary",
  ignore: Deno.env.get("NAPPLET_TEST_NPM_RUNNER") !== "1" || Deno.build.os === "windows",
  fn: async () => {
    await withTempDir(async (dir) => {
      const local = `${dir}/node_modules/@napplet/conformance-cli`;
      await Deno.mkdir(local, { recursive: true });
      await Deno.mkdir(`${dir}/node_modules/.bin`);
      await Deno.writeTextFile(`${dir}/package.json`, JSON.stringify({ private: true, dependencies: { "@napplet/conformance-cli": "^0.2.19" } }));
      await Deno.writeTextFile(`${local}/package.json`, JSON.stringify({ name: "@napplet/conformance-cli", version: "0.2.19", bin: { "napplet-conformance": "cli.js" } }));
      await Deno.writeTextFile(`${local}/cli.js`, '#!/usr/bin/env node\nconsole.log("OLD_LOCAL_RUNNER");process.exitCode=77;\n');
      await Deno.chmod(`${local}/cli.js`, 0o755);
      await Deno.symlink("../@napplet/conformance-cli/cli.js", `${dir}/node_modules/.bin/napplet-conformance`);
      const old = await runCommand("npx", ["--yes", "@napplet/conformance-cli", "screenshot", "--help"], { cwd: dir });
      assertEquals(old.code, 77);
      const output: string[] = [];
      const code = await runPackageCli("@napplet/conformance-cli", ["--help"], {
        runner: (command, args) => runCommand(command, args, { cwd: dir }),
        writeStdout: (line) => output.push(line),
        writeStderr: (line) => output.push(line),
      });
      assertEquals(code, 0, output.join("\n"));
      assert(output.join("\n").includes("Usage: napplet screenshot"));
      assert(!output.join("\n").includes("OLD_LOCAL_RUNNER"));
      const conformance = resolveConformanceCommand(undefined);
      const help = await runCommand(conformance.command, [...conformance.args, "--help"], { cwd: dir });
      assertEquals(help.code, 0, help.stderr);
      assert(help.stdout.includes("napplet-conformance screenshot"));
    });
  },
});
