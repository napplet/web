/** Opt-in black-box proof using the compiled binary and an empty host-tool PATH. */
import { join } from "node:path";
import { assert, assertEquals, withTempDir } from "./assert.ts";

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

Deno.test({
  name: "standalone commands provision and reuse tooling with no host runtimes or package managers",
  ignore: Deno.env.get("NAPPLET_TEST_STANDALONE") !== "1",
  fn: async () => {
    await withTempDir(async (root) => {
      const binary = Deno.env.get("NAPPLET_TEST_BINARY") ?? join(root, Deno.build.os === "windows" ? "napplet.exe" : "napplet");
      if (!Deno.env.get("NAPPLET_TEST_BINARY")) {
        const compile = await new Deno.Command(Deno.execPath(), {
          args: ["compile", "--no-check", "--node-modules-dir=none", "--allow-read", "--allow-write", "--allow-run", "--allow-env", "--allow-net", "--output", binary, "src/standalone.ts"],
          cwd: new URL("..", import.meta.url), stdout: "piped", stderr: "piped",
        }).output();
        assertEquals(compile.code, 0, decode(compile.stderr));
      }
      const emptyPath = join(root, "empty-path");
      await Deno.mkdir(emptyPath);
      const env = {
        PATH: emptyPath,
        NAPPLET_CACHE_DIR: join(root, "cache"),
        NAPPLET_KEYSTORE: "portable",
        NAPPLET_KEYSTORE_DIR: join(root, "keys"),
        NAPPLET_KEYSTORE_PASSWORD: "standalone test password only",
      };
      const run = async (args: string[], code = 0) => {
        console.log(`Standalone smoke: ${args[0]}`);
        const result = await new Deno.Command(binary, {
          args, cwd: root, env, stdin: "null", stdout: "piped", stderr: "piped",
          signal: AbortSignal.timeout(300000),
        }).output();
        assertEquals(result.code, code, `${args.join(" ")}\n${decode(result.stderr)}\n${decode(result.stdout)}`);
        return { stdout: decode(result.stdout), stderr: decode(result.stderr) };
      };
      await run(["--version"]);
      await run(["--help"]);
      await run(["guide"]);
      // The default hosted template exercises HTTP archive creation without Git.
      await run(["create", "starter", "--yes"]);
      assertEquals(JSON.parse(await Deno.readTextFile(join(root, "starter", "package.json"))).name, "starter");
      await Deno.mkdir(join(root, "dist"));
      await Deno.writeTextFile(join(root, "dist", "index.html"), '<!doctype html><html><head><title>Standalone proof</title><meta name="description" content="Standalone proof"></head><body style="background:#246;color:white"><h1>Standalone proof</h1></body></html>');
      await run(["init", "--source-dir", "dist", "--name", "proof", "--description", "Standalone proof"]);
      await run(["discover"]);
      await run(["debug"]);
      const configPath = join(root, ".napplet", "config.json");
      const config = JSON.parse(await Deno.readTextFile(configPath));
      config.blossomServers = ["https://blossom.example"];
      config.zapstore = { id: "org.example.proof", name: "Proof", enabled: true };
      await Deno.writeTextFile(configPath, JSON.stringify(config));
      await run(["keys", "doctor"]);
      await run(["keys", "store", "--name", "proof", "--sec", "01".padStart(64, "0")]);
      assert((await run(["keys", "list"])).stdout.includes("proof"));
      await run(["keys", "use", "--name", "proof"]);
      await run(["screenshot", "dist", "--output", "preview with spaces.png", "--width", "1200", "--height", "750", "--delay", "0"]);
      const png = await Deno.readFile(join(root, "preview with spaces.png"));
      assertEquals([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      const header = new DataView(png.buffer);
      assertEquals(header.getUint32(16), 1200);
      assertEquals(header.getUint32(20), 750);
      const report = await run(["deploy", "--screenshot", "--screenshot-delay", "0", "--dry-run", "--json"]);
      const deployment = JSON.parse(report.stdout);
      assert(deployment.dryRun);
      assert(deployment.application);
      assert(deployment.manifests.every((manifest: { signedEvent?: unknown }) => manifest.signedEvent));
      // A static document is sufficient to exercise the actual browser/check runner.
      const conformance = await new Deno.Command(binary, {
        args: ["conformance", "--", "--reporter", "json"], cwd: root, env,
        stdin: "null", stdout: "piped", stderr: "piped", signal: AbortSignal.timeout(60000),
      }).output();
      assert([0, 1].includes(conformance.code), decode(conformance.stderr));
      assert(JSON.parse(decode(conformance.stdout)));
      assert((await run(["paja", "--", "--help"])).stdout.includes("paja"));
      // Reuse the private cache with package/browser network access deliberately unavailable.
      const cached = await new Deno.Command(binary, {
        args: ["screenshot", "dist", "--output", "cached.png", "--delay", "0"], cwd: root,
        env: { ...env, HTTP_PROXY: "http://127.0.0.1:9", HTTPS_PROXY: "http://127.0.0.1:9", NO_PROXY: "127.0.0.1,localhost" },
        stdin: "null", stdout: "piped", stderr: "piped", signal: AbortSignal.timeout(60000),
      }).output();
      assertEquals(cached.code, 0, decode(cached.stderr));
      await run(["keys", "delete", "--name", "proof"]);
      assert(!(await run(["keys", "list"])).stdout.includes("proof"));
    });
  },
});
