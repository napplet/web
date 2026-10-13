/** Real recording through a compiled binary, private tools and empty host PATH. */
import { join, resolve } from "node:path";
import { seedRecordingPackage } from "./recording-package.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

Deno.test({
  name: "standalone gameplay capture provisions its encoder and records with no host tools",
  ignore: Deno.env.get("NAPPLET_TEST_STANDALONE") !== "1",
  fn: async () => {
    await withTempDir(async root => {
      const binary = resolve(Deno.env.get("NAPPLET_TEST_BINARY")!);
      const emptyPath = join(root, "empty-path");
      await Deno.mkdir(emptyPath);
      const env = { PATH: emptyPath, NAPPLET_CACHE_DIR: Deno.env.get("NAPPLET_TEST_CACHE_DIR") ?? join(root, "cache") };
      const run = async (args: string[], code = 0) => {
        console.log(`Standalone recording: ${args[0]}`);
        const result = await new Deno.Command(binary, {
          args, cwd: root, env, stdin: "null", stdout: "piped", stderr: "piped", signal: AbortSignal.timeout(300000),
        }).output();
        assertEquals(result.code, code, `${args.join(" ")}\n${decode(result.stderr)}\n${decode(result.stdout)}`);
        return { stdout: decode(result.stdout), stderr: decode(result.stderr) };
      };
      await Deno.mkdir(join(root, "dist"));
      await Deno.copyFile(new URL("../../conformance-cli/test/fixtures/gameplay.html", import.meta.url), join(root, "dist", "index.html"));
      await run(["init", "--source-dir", "dist", "--name", "game", "--description", "Gameplay proof"]);
      const configPath = join(root, ".napplet", "config.json");
      const config = JSON.parse(await Deno.readTextFile(configPath));
      config.blossomServers = ["https://blossom.example"];
      config.zapstore = { id: "org.example.game", name: "Game", enabled: true };
      await Deno.writeTextFile(configPath, JSON.stringify(config));
      await run(["screenshot", "dist", "--output", "cover.png", "--delay", "0"]);
      const recordingPackage = Deno.env.get("NAPPLET_TEST_RECORDING_PACKAGE");
      assert(recordingPackage, "Build and pack the recording runner before standalone tests");
      await seedRecordingPackage(resolve(recordingPackage), env);
      await Deno.copyFile(new URL("../../conformance-cli/test/fixtures/gameplay.html", import.meta.url), join(root, "dist", "index.html"));
      await Deno.writeTextFile(join(root, "recipe.json"), JSON.stringify([
        { type: "click", atMs: 100, x: 20, y: 20 },
        { type: "keyDown", atMs: 200, key: "ArrowRight" },
        { type: "keyUp", atMs: 800, key: "ArrowRight" },
      ]));
      await run(["record", "--output", "game with spaces.webm", "--actions", "recipe.json", "--delay", "0"]);
      const selection = JSON.parse(await Deno.readTextFile(configPath)).zapstore.video;
      assertEquals(selection.file, "game with spaces.webm");
      assertEquals(selection.width, 960);
      assertEquals(selection.height, 600);
      assert(selection.durationMs >= 5500 && selection.durationMs <= 8500, JSON.stringify(selection));
      const recorded = await Deno.readFile(join(root, selection.file));
      assertEquals([...recorded.subarray(0, 4)], [0x1a, 0x45, 0xdf, 0xa3]);
      const videoReport = JSON.parse((await run(["deploy", "--zapstore", "--dry-run", "--json"])).stdout);
      assert(videoReport.application.template.tags.some((tag: string[]) => tag[0] === "imeta" && tag.includes("m video/webm")));
      const offline = await new Deno.Command(binary, {
        args: ["record", "--output", "cached.webm", "--duration", "1000", "--delay", "0"], cwd: root,
        env: { ...env, HTTP_PROXY: "http://127.0.0.1:9", HTTPS_PROXY: "http://127.0.0.1:9", NO_PROXY: "127.0.0.1,localhost" },
        stdin: "null", stdout: "piped", stderr: "piped", signal: AbortSignal.timeout(60000),
      }).output();
      assertEquals(offline.code, 0, decode(offline.stderr));
      await Deno.writeTextFile(join(root, "dist", "index.html"), "<!-- rebuilt -->", { append: true });
      assert((await run(["deploy", "--zapstore", "--dry-run", "--json"], 1)).stderr.includes("different build"));
      await run(["record", "--clear"]);
      assertEquals(await Deno.readFile(join(root, selection.file)), recorded);
      await run(["deploy", "--zapstore", "--dry-run", "--json"]);
    });
  },
});
