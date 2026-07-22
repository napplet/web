import {
  loadDeployConfig,
  resolveConformanceCommand,
  resolvePajaArgs,
  runPackageCli,
} from "../src/cli.ts";
import { defaultConfig } from "../src/config.ts";
import { collectFlags } from "../src/flags.ts";
import { assert, assertEquals } from "./assert.ts";

Deno.test("loadDeployConfig bootstraps missing config in interactive deploy", async () => {
  const flags = collectFlags(["--name", "gbcolor"]);
  const config = defaultConfig({
    sourceDir: "dist",
    relays: ["wss://relay.example"],
    blossomServers: ["https://cdn.example"],
    named: ["gbcolor"],
  });
  const statuses: string[] = [];
  const reports: string[] = [];
  let initCalled = false;

  const result = await loadDeployConfig(flags, false, {
    readConfig: () => Promise.resolve(null),
    isTerminalInput: () => true,
    runInit(seenFlags) {
      assertEquals(seenFlags, flags);
      initCalled = true;
      return Promise.resolve({
        path: "/repo/.napplet/config.json",
        config,
        created: true,
      });
    },
    printStatus: (line) => statuses.push(line),
    printReport: (report) => reports.push(report),
  });

  assert(initCalled);
  assertEquals(result, config);
  assert(statuses[0].includes("Starting interactive setup"));
  assert(reports[0].includes("Napplet Init Complete"));
  assert(reports[0].includes("napplet deploy --dry-run"));
});

Deno.test("loadDeployConfig preserves non-interactive missing config failure", async () => {
  let initCalled = false;
  let message = "";

  try {
    await loadDeployConfig(collectFlags([]), false, {
      readConfig: () => Promise.resolve(null),
      isTerminalInput: () => false,
      runInit() {
        initCalled = true;
        return Promise.reject(new Error("should not initialize"));
      },
    });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  assert(!initCalled);
  assert(message.includes("No .napplet config found"));
  assert(message.includes("Run: napplet init"));
});

Deno.test("loadDeployConfig preserves json missing config failure", async () => {
  let initCalled = false;
  let message = "";

  try {
    await loadDeployConfig(collectFlags(["--json"]), true, {
      readConfig: () => Promise.resolve(null),
      isTerminalInput: () => true,
      runInit() {
        initCalled = true;
        return Promise.reject(new Error("should not initialize"));
      },
    });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  assert(!initCalled);
  assert(message.includes("No .napplet config found"));
});

Deno.test("loadDeployConfig preserves explicit config missing config failure", async () => {
  const flags = collectFlags(["--config", "/tmp/missing-config.json"]);
  let initCalled = false;
  let message = "";

  try {
    await loadDeployConfig(flags, false, {
      readConfig: () => Promise.resolve(null),
      isTerminalInput: () => true,
      runInit() {
        initCalled = true;
        return Promise.reject(new Error("should not initialize"));
      },
    });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  assert(!initCalled);
  assert(message.includes("at /tmp/missing-config.json"));
  assert(message.includes("Run: napplet init"));
});

Deno.test("loadDeployConfig returns an existing config without initializing", async () => {
  const config = defaultConfig({ sourceDir: "public", named: ["site"] });
  let initCalled = false;

  const result = await loadDeployConfig(collectFlags([]), false, {
    readConfig: () => Promise.resolve(config),
    isTerminalInput: () => true,
    runInit() {
      initCalled = true;
      return Promise.reject(new Error("should not initialize"));
    },
  });

  assert(!initCalled);
  assertEquals(result, config);
});

Deno.test("runPackageCli preserves create arguments as an explicit argv array", async () => {
  const calls: Array<{ command: string; args: string[] }> = [];
  const stdout: string[] = [];
  const code = await runPackageCli(
    "@napplet/boilerplate",
    ["project with spaces", "--template", "./local template", "--force"],
    {
      runner(command, args) {
        calls.push({ command, args });
        return Promise.resolve({ code: 0, stdout: "created\n", stderr: "" });
      },
      writeStdout: (value) => stdout.push(value),
      os: "darwin",
    },
  );

  assertEquals(code, 0);
  assertEquals(calls, [{
    command: "npx",
    args: [
      "--yes",
      "@napplet/boilerplate",
      "project with spaces",
      "--template",
      "./local template",
      "--force",
    ],
  }]);
  assertEquals(stdout, ["created"]);
});

Deno.test("runPackageCli preserves skills target passthrough on Windows", async () => {
  const calls: Array<{ command: string; args: string[] }> = [];
  const code = await runPackageCli("@napplet/skills", ["install", "--to", "agents"], {
    runner(command, args) {
      calls.push({ command, args });
      return Promise.resolve({ code: 3, stdout: "", stderr: "failed\n" });
    },
    writeStderr: () => {},
    os: "windows",
  });

  assertEquals(code, 3);
  assertEquals(calls, [{
    command: "npx.cmd",
    args: ["--yes", "@napplet/skills", "install", "--to", "agents"],
  }]);
});

Deno.test("resolveConformanceCommand runs the package-backed CLI without a global binary", () => {
  assertEquals(resolveConformanceCommand("napplet-conformance", "darwin"), {
    command: "npx",
    args: ["--yes", "@napplet/conformance-cli"],
  });
  assertEquals(resolveConformanceCommand(undefined, "windows"), {
    command: "npx.cmd",
    args: ["--yes", "@napplet/conformance-cli"],
  });
});

Deno.test("resolveConformanceCommand preserves an explicit custom runner", () => {
  assertEquals(resolveConformanceCommand("pnpm exec custom-conformance", "linux"), {
    command: "pnpm",
    args: ["exec", "custom-conformance"],
  });
});

Deno.test("resolvePajaArgs restores the managed-command separator", () => {
  assertEquals(resolvePajaArgs(["pnpm", "vite", "--host", "127.0.0.1"]), [
    "--",
    "pnpm",
    "vite",
    "--host",
    "127.0.0.1",
  ]);
  assertEquals(resolvePajaArgs(["--port", "5173"]), ["--port", "5173"]);
  assertEquals(
    resolvePajaArgs(["--target-url", "http://127.0.0.1:5173", "--", "pnpm", "vite"]),
    ["--target-url", "http://127.0.0.1:5173", "--", "pnpm", "vite"],
  );
});
