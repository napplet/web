import { collectFlags } from "../src/flags.ts";
import { canPrompt, currentInteraction, resolveInteraction, withInteraction } from "../src/interaction.ts";
import { promptLine, promptSecret } from "../src/prompt.ts";
import { PortableKeyStore } from "../src/portable-key-store.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

Deno.test("-i is a boolean opt-out and does not consume arguments or passthrough", () => {
  const flags = collectFlags(["-i", "--name", "notes", "--", "-i"]);
  assert(flags.boolean.has("non-interactive"));
  assertEquals(flags.values.get("name"), ["notes"]);
  assertEquals(flags.positional, []);
  assertEquals(flags.afterDoubleDash, ["-i"]);
  assert(collectFlags(["--non-interactive"]).boolean.has("non-interactive"));
});

Deno.test("terminal policy disables prompts for flags, JSON, CI and redirected streams", () => {
  const terminal = { inputTerminal: true, outputTerminal: true, env: {} };
  assert(resolveInteraction(terminal).interactive);
  for (const override of [{ nonInteractive: true }, { json: true }, { inputTerminal: false },
    { outputTerminal: false }, { env: { CI: "true" } }, { env: { CI: "1" } }]) {
    assert(!resolveInteraction({ ...terminal, ...override }).interactive);
  }
  assert(resolveInteraction({ ...terminal, env: { CI: "false" } }).interactive);
  assert(!resolveInteraction({ ...terminal, env: { NO_COLOR: "" } }).color);
  assert(!resolveInteraction({ ...terminal, env: { TERM: "dumb" } }).color);
  assert(!resolveInteraction({ ...terminal, json: true }).color);
});

Deno.test("scoped policy blocks nested terminal prompts without reading input", async () => {
  let reads = 0;
  const input = { isTerminal: () => true, read: async () => { reads++; return null; }, setRaw() {} };
  await withInteraction({ interactive: false, color: false }, async () => {
    assert(!canPrompt());
    for (const run of [() => promptLine({ message: "Name", input }), () => promptSecret({ input })]) {
      let error = "";
      try { await run(); } catch (e) { error = String(e); }
      assert(error.includes("Prompts are disabled"));
    }
  });
  assertEquals(reads, 0);
  assertEquals(currentInteraction(), undefined);
});

Deno.test("explicit secret input can still be piped without a terminal prompt", async () => {
  const input = { isTerminal: () => false, readable: new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new TextEncoder().encode("test secret\n")); controller.close(); },
  }) };
  const secret = await withInteraction({ interactive: false, color: false }, () => promptSecret({ input }));
  assertEquals(secret, "test secret");
});

Deno.test("non-interactive portable key storage requires an environment password", async () => {
  if (Deno.env.get("NAPPLET_KEYSTORE_PASSWORD")) return;
  await withTempDir(async (dir) => {
    let error = "";
    await withInteraction({ interactive: false, color: false }, async () => {
      try { await new PortableKeyStore(dir).store({ service: "test", account: "test", secret: "test" }); }
      catch (e) { error = String(e); }
    });
    assert(error.includes("NAPPLET_KEYSTORE_PASSWORD"));
    assertEquals([...Deno.readDirSync(dir)].length, 0);
  });
});
