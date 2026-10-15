import { withInteraction } from "../src/interaction.ts";
import { createLiveDeployReporter } from "../src/deploy-progress.ts";
import { fitStatus, renderBanner, renderProgressBar } from "../src/terminal.ts";
import { main } from "../src/cli.ts";
import { assert, assertEquals } from "./assert.ts";

Deno.test("banner supports color, plain text and narrow terminals", () => {
  const plain = withInteraction({ color: false, interactive: true }, () => renderBanner("1.2.3", 80));
  assert(plain.includes("napplet 1.2.3"));
  assert(plain.includes("|_|"));
  assert(!plain.includes("\x1b"));
  const colored = withInteraction({ color: true, interactive: true }, () => renderBanner("1.2.3", 80));
  assert(colored.includes("\x1b[36m"));
  const narrow = withInteraction({ color: false, interactive: true }, () => renderBanner("1.2.3", 30));
  assert(narrow.startsWith("\nnapplet\n"));
});

Deno.test("progress bar clamps counts and status lines fit the available width", () => {
  assertEquals(renderProgressBar(1, 4, 4), "[█░░░] 25%");
  assertEquals(renderProgressBar(9, 4, 4), "[████] 100%");
  assertEquals(renderProgressBar(-1, 4, 4), "[░░░░] 0%");
  assertEquals(renderProgressBar(0, 0, 4), "[░░░░] 0%");
  assertEquals(fitStatus("abcdefghijkl", 8), "abcde...");
  assert(!fitStatus("bad\x1b[2J\ntext", 80).includes("\x1b"));
});

Deno.test("live progress distinguishes uploaded, present and failed operations", () => {
  const frames: string[] = [];
  withInteraction({ color: false, interactive: true }, () => {
    const update = createLiveDeployReporter({ write: (text) => frames.push(text), width: () => 100, now: () => 1000 });
    update({ type: "upload:start", files: 2, servers: 1, totalUploads: 2 });
    update({ type: "upload:result", totalUploads: 2, completedUploads: 1, result: { server: "http://localhost:9000", file: "/index.html", sha256: "a".repeat(64), success: true, skipped: true } });
    update({ type: "upload:result", totalUploads: 2, completedUploads: 2, result: { server: "http://localhost:9000", file: "/icon.png", sha256: "b".repeat(64), success: false, skipped: false, error: "unavailable" } });
    update({ type: "upload:complete", summary: { totalUploads: 2, failedUploads: 1, servers: 1, serversFullyUploaded: 0 } });
    update({ type: "publish:skipped", summary: { totalUploads: 2, failedUploads: 1, servers: 1, serversFullyUploaded: 0 } });
  });
  const all = frames.join("");
  assert(all.includes("1 present, 1 failed"));
  assert(all.includes("100%"));
  assert(all.includes("Uploads: 1/2 ready"));
  assert(all.includes("Publish skipped"));
  assert(!all.includes("Published:"));
});

Deno.test("global -i works before or after command and is not forwarded past the boundary", async () => {
  for (const argv of [["-i", "create", "notes"], ["create", "notes", "-i"], ["create", "--non-interactive", "notes"]]) {
    let seen: readonly string[] = [];
    assertEquals(await main(argv, { runCreate(args) { seen = args; return 0; } }), 0);
    assertEquals(seen, ["notes", "--yes"]);
  }
});
