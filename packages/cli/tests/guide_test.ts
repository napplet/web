import { commandGuide, renderGuide } from "../src/guide.ts";
import { assertEquals } from "./assert.ts";

Deno.test("napplet guide presents the workflow with contextual and closing docs links", () => {
  const output = renderGuide();
  const commands = [
    "napplet create my-napplet",
    "napplet init",
    "napplet skills install --to codex",
    "pnpm verify",
    "napplet deploy --dry-run",
    "napplet deploy",
  ];
  let offset = -1;
  for (const command of commands) {
    const next = output.indexOf(command, offset + 1);
    if (next === -1 || next <= offset) {
      throw new Error(`Guide command is missing or out of order: ${command}`);
    }
    offset = next;
  }
  for (
    const url of [
      "https://napplet.run/docs/packages/boilerplate.html",
      "https://napplet.run/docs/packages/skills.html",
      "https://napplet.run/docs/guide/getting-started.html",
      "https://napplet.run/docs/",
    ]
  ) {
    if (!output.includes(url)) throw new Error(`Guide is missing docs link: ${url}`);
  }

  const writes: string[] = [];
  assertEquals(commandGuide({ write: (value) => writes.push(value) }), 0);
  assertEquals(writes, [output]);
});
