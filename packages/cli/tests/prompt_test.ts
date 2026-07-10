import {
  isTerminalInput,
  promptLine,
  promptSecret,
  type SecretPromptInput,
} from "../src/prompt.ts";
import { assert, assertEquals } from "./assert.ts";

class FakeTerminalInput implements SecretPromptInput {
  #data: Uint8Array;
  #offset = 0;
  readonly rawModes: boolean[] = [];

  constructor(text: string) {
    this.#data = new TextEncoder().encode(text);
  }

  isTerminal(): boolean {
    return true;
  }

  setRaw(mode: boolean): void {
    this.rawModes.push(mode);
  }

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

Deno.test("promptSecret reads hidden TTY input until Enter", async () => {
  const input = new FakeTerminalInput("nsec1secret\n");
  const output = new FakeOutput();

  const secret = await promptSecret({ input, output });

  assertEquals(secret, "nsec1secret");
  assertEquals(input.rawModes, [true, false]);
  assert(output.text.includes("press Enter"));
  assert(!output.text.includes("nsec1secret"), "prompt output must not echo the secret");
});

Deno.test("promptSecret keeps piped stdin fallback for non-interactive runs", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("nbunksec1pipe\n"));
      controller.close();
    },
  });

  const secret = await promptSecret({
    input: {
      isTerminal: () => false,
      readable: stream,
    },
    output: new FakeOutput(),
  });

  assertEquals(secret, "nbunksec1pipe");
});

Deno.test("promptLine echoes TTY input and accepts defaults", async () => {
  const input = new FakeTerminalInput("\nfeed\n");
  const output = new FakeOutput();

  const sourceDir = await promptLine({
    message: "Source directory",
    defaultValue: ".",
    input,
    output,
  });
  const name = await promptLine({
    message: "Named napplet d tag",
    input,
    output,
  });

  assertEquals(sourceDir, ".");
  assertEquals(name, "feed");
  assertEquals(input.rawModes, [true, false, true, false]);
  assert(output.text.includes("Source directory [.]"));
  assert(output.text.includes("feed"));
});

Deno.test("promptLine prints suggestions before the prompt", async () => {
  const input = new FakeTerminalInput("1\n");
  const output = new FakeOutput();

  const value = await promptLine({
    message: "Relay URLs",
    suggestions: ["wss://relay.example"],
    input,
    output,
  });

  assertEquals(value, "1");
  assert(output.text.includes("Suggestions:"));
  assert(output.text.includes("1. wss://relay.example"));
});

Deno.test("isTerminalInput falls back to false", () => {
  assertEquals(isTerminalInput({ isTerminal: () => true }), true);
  assertEquals(isTerminalInput({}), false);
});
