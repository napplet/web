/// <reference lib="deno.ns" />

import { createNetworkPolicy } from "./index.ts";

function assertRejects(action: () => Promise<unknown>, includes: string): Promise<void> {
  return action().then(
    () => { throw new Error("expected rejection"); },
    (error) => {
      if (!(error instanceof Error) || !error.message.includes(includes)) {
        throw new Error(`expected error including ${JSON.stringify(includes)}, got ${String(error)}`);
      }
    },
  );
}

Deno.test("network policy rejects unsafe URL forms and non-public DNS answers", async () => {
  const policy = createNetworkPolicy({ resolve: () => Promise.resolve(["93.184.216.34"]) });
  for (const url of [
    "http://public.example",
    "https://user:pass@public.example",
    "https://public.example/#fragment",
    "https://127.0.0.1",
    "https://localhost",
  ]) {
    await assertRejects(() => policy.validate(new URL(url), new AbortController().signal), "unsafe endpoint");
  }

  const privatePolicy = createNetworkPolicy({ resolve: () => Promise.resolve(["93.184.216.34", "10.0.0.1"]) });
  await assertRejects(
    () => privatePolicy.validate(new URL("https://mixed.example"), new AbortController().signal),
    "unsafe endpoint",
  );
});

Deno.test("network policy validates each redirect target with a fresh resolution", async () => {
  const answers = new Map<string, string[]>([
    ["public.example", ["93.184.216.34"]],
    ["rebound.example", ["169.254.169.254"]],
  ]);
  const policy = createNetworkPolicy({ resolve: (hostname) => Promise.resolve(answers.get(hostname) ?? []) });
  const signal = new AbortController().signal;

  await policy.validate(new URL("https://public.example/upload"), signal);
  await assertRejects(
    () => policy.validate(new URL("https://rebound.example/upload"), signal),
    "unsafe endpoint",
  );
});

Deno.test("a validated DNS answer is not a connection pin", async () => {
  const policy = createNetworkPolicy({ resolve: () => Promise.resolve(["93.184.216.34"]) });
  const endpoint = await policy.validate(new URL("https://rebind.example/upload"), new AbortController().signal);
  if (endpoint.addresses[0] !== "93.184.216.34") throw new Error("expected public validation answer");
  // Blossom's request layer has no global-fetch fallback: a later rebinding
  // answer cannot be reached unless a platform supplies a pinned transport.
});
