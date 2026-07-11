import { loadDeployConfig } from "../src/cli.ts";
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
