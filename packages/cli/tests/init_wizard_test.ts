import { normalizeNamedDTags, promptInitWizard } from "../src/init-wizard.ts";
import type { SecretPromptInput } from "../src/prompt.ts";
import { assert, assertEquals } from "./assert.ts";

class FakeTerminalInput implements SecretPromptInput {
  #data: Uint8Array;
  #offset = 0;

  constructor(text: string) {
    this.#data = new TextEncoder().encode(text);
  }

  isTerminal(): boolean {
    return true;
  }

  setRaw(_mode: boolean): void {}

  read(buffer: Uint8Array): Promise<number | null> {
    if (this.#offset >= this.#data.length) return Promise.resolve(null);
    const remaining = this.#data.length - this.#offset;
    const count = Math.min(buffer.length, remaining);
    buffer.set(this.#data.slice(this.#offset, this.#offset + count));
    this.#offset += count;
    return Promise.resolve(count);
  }
}

class FakeOutput {
  text = "";

  writeSync(bytes: Uint8Array): number {
    this.text += new TextDecoder().decode(bytes);
    return bytes.length;
  }
}

const suggestions = {
  relays: ["wss://relay-one.example", "wss://relay-two.example"],
  blossomServers: ["https://cdn-one.example", "https://cdn-two.example"],
};

Deno.test("promptInitWizard fills missing fields with URL autocomplete", async () => {
  const input = new FakeTerminalInput(
    "\n\nfeed\n\nA focused feed\nnote:napplet:note/open\nwss://relay-o\t\nwss://relay-t\t\n\nhttps://cdn-o\t\n\n",
  );
  const output = new FakeOutput();

  const result = await promptInitWizard({
    seed: {
      sourceDir: undefined,
      relays: [],
      blossomServers: [],
      named: [],
      title: undefined,
      description: undefined,
      archetypes: [],
      root: false,
    },
    suggestions,
    input,
    output,
  });

  assertEquals(result, {
    sourceDir: ".",
    relays: ["wss://relay-one.example", "wss://relay-two.example"],
    blossomServers: ["https://cdn-one.example"],
    named: ["feed"],
    title: "Feed",
    description: "A focused feed",
    archetypes: [{ slug: "note", convention: "napplet:note/open" }],
    defaultTarget: "named",
  });
  assert(output.text.includes("Relay URLs"));
  assert(!output.text.includes("1. wss://relay-one.example"));
  assert(output.text.includes("wss://relay-one.example"));
});

Deno.test("promptInitWizard preserves flagged values and root target", async () => {
  const result = await promptInitWizard({
    seed: {
      sourceDir: "dist",
      relays: ["wss://relay.flagged"],
      blossomServers: ["https://cdn.flagged"],
      named: ["ignored"],
      title: "Root App",
      description: "Root description",
      archetypes: ["feed:napplet:feed/open"],
      root: true,
    },
    suggestions,
    input: new FakeTerminalInput(""),
    output: new FakeOutput(),
  });

  assertEquals(result, {
    sourceDir: "dist",
    relays: ["wss://relay.flagged"],
    blossomServers: ["https://cdn.flagged"],
    named: [],
    title: "Root App",
    description: "Root description",
    archetypes: [{ slug: "feed", convention: "napplet:feed/open" }],
    defaultTarget: "root",
  });
});

Deno.test("normalizeNamedDTags validates NIP-5A d tag shape", () => {
  assertEquals(normalizeNamedDTags(["feed", "feed", "wiki"]), ["feed", "wiki"]);
  let message = "";
  try {
    normalizeNamedDTags(["Bad_Name"]);
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert(message.includes("Bad_Name"));
});
