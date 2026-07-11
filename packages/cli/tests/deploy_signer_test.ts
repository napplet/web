import { defaultConfig } from "../src/config.ts";
import { createDeploySigner } from "../src/deploy-signer.ts";
import { KEY_SERVICE_NAME, type KeyStoreProvider, type StoredSecret } from "../src/key-store.ts";
import { DEFAULT_CONNECT_RELAYS } from "../src/nostr-connect.ts";
import { encodeNbunksec, type NappletSigner } from "../src/signing.ts";
import type { NappletConfig, NostrEventTemplate, SignedNostrEvent } from "../src/types.ts";
import { assert, assertEquals } from "./assert.ts";

const pubkey = "02".repeat(32);

function fakeSigner(signerPubkey = pubkey): NappletSigner {
  return {
    pubkey: signerPubkey,
    sign(template: NostrEventTemplate): Promise<SignedNostrEvent> {
      return Promise.resolve({
        ...template,
        id: "0".repeat(64),
        pubkey: signerPubkey,
        sig: "0".repeat(128),
      });
    },
    close: () => Promise.resolve(),
  };
}

function provider(options: {
  retrieve?: Record<string, string | null>;
  stores?: StoredSecret[];
} = {}): KeyStoreProvider {
  return {
    name: "test key store",
    isAvailable: () => Promise.resolve(true),
    store(secret) {
      options.stores?.push(secret);
      return Promise.resolve();
    },
    retrieve(_service, account) {
      return Promise.resolve(options.retrieve?.[account] ?? null);
    },
    delete: () => Promise.resolve(false),
    list: () => Promise.resolve([]),
  };
}

Deno.test("createDeploySigner uses a stored bunker session for configured pubkeys", async () => {
  const createCalls: string[] = [];
  const prints: string[] = [];
  const storedSecret = encodeNbunksec({
    pubkey,
    localKey: "03".repeat(32),
    relays: ["wss://relay.test"],
  });
  const result = await createDeploySigner(
    { type: "bunker-pubkey", source: "config", pubkey, relays: ["wss://relay.test"] },
    defaultConfig(),
    {
      required: true,
      interactiveConnect: false,
      getKeyStoreProvider: () =>
        Promise.resolve(provider({ retrieve: { [pubkey]: storedSecret } })),
      createSigner(secret) {
        createCalls.push(secret);
        return Promise.resolve(fakeSigner());
      },
      print(line) {
        prints.push(line);
      },
    },
  );

  assert(result.signer);
  assertEquals(createCalls, [storedSecret]);
  assert(prints.some((line) => line.includes("Connecting to stored remote signer")));
  assert(prints.some((line) => line.includes("Remote signer pubkey:")));
  assert(prints.some((line) => line.includes("Using bunker relay: wss://relay.test")));
  assert(prints.some((line) => line.includes("Waiting for stored remote signer response")));
  assertEquals(result.signing, {
    type: "stored",
    source: "config",
    keyReference: pubkey,
  });
});

Deno.test("createDeploySigner reconnects stale key references with configured bunker pubkeys", async () => {
  const stores: StoredSecret[] = [];
  const written: NappletConfig[] = [];
  const prints: string[] = [];
  const createCalls: string[] = [];

  const result = await createDeploySigner(
    { type: "stored", source: "config", keyReference: "default" },
    defaultConfig({
      signing: {
        mode: "interactive",
        keyReference: "default",
        pubkey,
        relays: ["wss://relay.config"],
      },
    }),
    {
      required: true,
      interactiveConnect: true,
      getKeyStoreProvider: () => Promise.resolve(provider({ stores })),
      promptConnectRelays(defaults) {
        assertEquals(defaults, ["wss://relay.config"]);
        return Promise.resolve([...defaults]);
      },
      connectRemoteSigner(options) {
        assertEquals(options.relays, ["wss://relay.config"]);
        return Promise.resolve({
          nbunksec: "nbunksec1reconnected",
          pubkey,
          relays: ["wss://relay.config"],
        });
      },
      createSigner(secret) {
        createCalls.push(secret);
        return Promise.resolve(fakeSigner());
      },
      writeConfig(config) {
        written.push(config);
        return Promise.resolve();
      },
      print(line) {
        prints.push(line);
      },
    },
  );

  assert(result.signer);
  assertEquals(createCalls, ["nbunksec1reconnected"]);
  assertEquals(stores, [{
    service: KEY_SERVICE_NAME,
    account: pubkey,
    secret: "nbunksec1reconnected",
  }]);
  assertEquals(written[0].signing, {
    mode: "interactive",
    keyReference: pubkey,
    pubkey,
    relays: ["wss://relay.config"],
  });
  assert(prints.some((line) => line.includes("Reconnecting to configured bunker")));
  assert(prints.some((line) => line.includes("Starting Nostr Connect for configured bunker")));
});

Deno.test("createDeploySigner reconnects failed stored sessions in interactive deploy", async () => {
  const stores: StoredSecret[] = [];
  const written: NappletConfig[] = [];
  const prints: string[] = [];
  const createCalls: string[] = [];

  const result = await createDeploySigner(
    { type: "stored", source: "config", keyReference: "default" },
    defaultConfig({
      signing: {
        mode: "interactive",
        keyReference: "default",
        pubkey,
        relays: ["wss://relay.config"],
      },
    }),
    {
      required: true,
      interactiveConnect: true,
      getKeyStoreProvider: () =>
        Promise.resolve(provider({
          retrieve: { default: "nbunksec1stale" },
          stores,
        })),
      promptConnectRelays(defaults) {
        assertEquals(defaults, ["wss://relay.config"]);
        return Promise.resolve([...defaults]);
      },
      connectRemoteSigner(options) {
        assertEquals(options.relays, ["wss://relay.config"]);
        return Promise.resolve({
          nbunksec: "nbunksec1fresh",
          pubkey,
          relays: ["wss://relay.config"],
        });
      },
      createSigner(secret) {
        createCalls.push(secret);
        if (secret === "nbunksec1stale") {
          return Promise.reject(new Error("Remote signer connection timed out after 30s"));
        }
        return Promise.resolve(fakeSigner());
      },
      writeConfig(config) {
        written.push(config);
        return Promise.resolve();
      },
      print(line) {
        prints.push(line);
      },
    },
  );

  assert(result.signer);
  assertEquals(createCalls, ["nbunksec1stale", "nbunksec1fresh"]);
  assertEquals(stores, [{
    service: KEY_SERVICE_NAME,
    account: pubkey,
    secret: "nbunksec1fresh",
  }]);
  assertEquals(written[0].signing?.keyReference, pubkey);
  assert(prints.some((line) => line.includes('Stored remote signer "default" failed')));
  assert(prints.some((line) => line.includes("Reconnecting to configured bunker")));
});

Deno.test("createDeploySigner fails closed for stale key references outside reconnect mode", async () => {
  let connectCalled = false;
  let message = "";

  try {
    await createDeploySigner(
      { type: "stored", source: "config", keyReference: "missing" },
      defaultConfig({
        signing: {
          mode: "interactive",
          keyReference: "missing",
          pubkey,
          relays: ["wss://relay.config"],
        },
      }),
      {
        required: true,
        interactiveConnect: false,
        getKeyStoreProvider: () => Promise.resolve(provider()),
        connectRemoteSigner() {
          connectCalled = true;
          return Promise.reject(new Error("should not reconnect"));
        },
      },
    );
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  assert(!connectCalled);
  assert(message.includes('No key reference "missing"'));
  assert(message.includes("configured bunker"));
  assert(message.includes("interactive terminal"));
});

Deno.test("createDeploySigner reconnects stale key references without native key storage", async () => {
  const written: NappletConfig[] = [];

  const result = await createDeploySigner(
    { type: "stored", source: "config", keyReference: "default" },
    defaultConfig({
      signing: {
        mode: "interactive",
        keyReference: "default",
        pubkey,
        relays: ["wss://relay.config"],
      },
    }),
    {
      required: true,
      interactiveConnect: true,
      getKeyStoreProvider: () => Promise.resolve(null),
      promptConnectRelays(defaults) {
        assertEquals(defaults, ["wss://relay.config"]);
        return Promise.resolve([...defaults]);
      },
      connectRemoteSigner: () =>
        Promise.resolve({
          nbunksec: "nbunksec1session",
          pubkey,
          relays: ["wss://relay.config"],
        }),
      createSigner: () => Promise.resolve(fakeSigner()),
      writeConfig(config) {
        written.push(config);
        return Promise.resolve();
      },
    },
  );

  assert(result.signer);
  assertEquals(result.signing, {
    type: "bunker-pubkey",
    source: "config",
    pubkey,
    relays: ["wss://relay.config"],
  });
  assertEquals(written[0].signing?.keyReference, undefined);
  assertEquals(written[0].signing?.pubkey, pubkey);
});

Deno.test("createDeploySigner accepts prompt secret when configured pubkey matches", async () => {
  let confirmCalled = false;
  const result = await createDeploySigner(
    { type: "prompt", source: "prompt-sec" },
    defaultConfig({ bunkerPubkey: pubkey }),
    {
      promptSecret: () => Promise.resolve("nsec1secret"),
      createSigner: () => Promise.resolve(fakeSigner(pubkey)),
      confirmSignerMismatch: () => {
        confirmCalled = true;
        return Promise.resolve(true);
      },
    },
  );

  assert(result.signer);
  assertEquals(result.signer.pubkey, pubkey);
  assertEquals(confirmCalled, false);
});

Deno.test("createDeploySigner can continue prompt secret after mismatch confirmation", async () => {
  const otherPubkey = "03".repeat(32);
  const confirmations: Array<[string, string]> = [];

  const result = await createDeploySigner(
    { type: "prompt", source: "prompt-sec" },
    defaultConfig({ bunkerPubkey: pubkey }),
    {
      promptSecret: () => Promise.resolve("nsec1secret"),
      createSigner: () => Promise.resolve(fakeSigner(otherPubkey)),
      confirmSignerMismatch(actual, expected) {
        confirmations.push([actual, expected]);
        return Promise.resolve(true);
      },
    },
  );

  assert(result.signer);
  assertEquals(result.signer.pubkey, otherPubkey);
  assertEquals(confirmations, [[otherPubkey, pubkey]]);
});

Deno.test("createDeploySigner rejects non-interactive prompt secret pubkey mismatch", async () => {
  const otherPubkey = "03".repeat(32);
  const prints: string[] = [];
  let message = "";

  try {
    await createDeploySigner(
      { type: "prompt", source: "prompt-sec" },
      defaultConfig({ bunkerPubkey: pubkey }),
      {
        promptSecret: () => Promise.resolve("nsec1secret"),
        createSigner: () => Promise.resolve(fakeSigner(otherPubkey)),
        isTerminalInput: () => false,
        print: (line) => prints.push(line),
      },
    );
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  assert(message.includes("does not match configured pubkey"));
  assert(prints.some((line) => line.includes("This may be the wrong key")));
});

Deno.test("createDeploySigner starts Nostr Connect when interactive deploy has no signer", async () => {
  const stores: StoredSecret[] = [];
  const written: NappletConfig[] = [];
  const prints: string[] = [];
  const createCalls: string[] = [];

  const result = await createDeploySigner(
    { type: "none" },
    defaultConfig({ relays: ["wss://relay.project"] }),
    {
      required: true,
      interactiveConnect: true,
      getKeyStoreProvider: () => Promise.resolve(provider({ stores })),
      promptConnectRelays(defaults) {
        assertEquals(defaults, [...DEFAULT_CONNECT_RELAYS]);
        return Promise.resolve([...defaults]);
      },
      connectRemoteSigner(options) {
        assertEquals(options.relays, [...DEFAULT_CONNECT_RELAYS]);
        return Promise.resolve({
          nbunksec: "nbunksec1connected",
          pubkey,
          relays: [...DEFAULT_CONNECT_RELAYS],
        });
      },
      createSigner(secret) {
        createCalls.push(secret);
        return Promise.resolve(fakeSigner());
      },
      writeConfig(config) {
        written.push(config);
        return Promise.resolve();
      },
      print(line) {
        prints.push(line);
      },
    },
  );

  assert(result.signer);
  assertEquals(createCalls, ["nbunksec1connected"]);
  assertEquals(stores, [{
    service: KEY_SERVICE_NAME,
    account: pubkey,
    secret: "nbunksec1connected",
  }]);
  assertEquals(written[0].bunkerPubkey, pubkey);
  assertEquals(written[0].signing, {
    mode: "interactive",
    keyReference: pubkey,
    pubkey,
    relays: [...DEFAULT_CONNECT_RELAYS],
  });
  assert(prints.some((line) => line.includes("Starting Nostr Connect")));
});

Deno.test("createDeploySigner continues current deploy when interactive storage is unavailable", async () => {
  const written: NappletConfig[] = [];
  const result = await createDeploySigner(
    { type: "none" },
    defaultConfig(),
    {
      required: true,
      interactiveConnect: true,
      getKeyStoreProvider: () => Promise.resolve(null),
      promptConnectRelays(defaults) {
        assertEquals(defaults, [...DEFAULT_CONNECT_RELAYS]);
        return Promise.resolve([...defaults]);
      },
      connectRemoteSigner: () =>
        Promise.resolve({
          nbunksec: "nbunksec1session",
          pubkey,
          relays: [...DEFAULT_CONNECT_RELAYS],
        }),
      createSigner: () => Promise.resolve(fakeSigner()),
      writeConfig(config) {
        written.push(config);
        return Promise.resolve();
      },
    },
  );

  assert(result.signer);
  assertEquals(result.signing, {
    type: "bunker-pubkey",
    source: "config",
    pubkey,
    relays: [...DEFAULT_CONNECT_RELAYS],
  });
  assertEquals(written[0].signing?.keyReference, undefined);
  assertEquals(written[0].signing?.pubkey, pubkey);
});

Deno.test("createDeploySigner fails explicitly for non-interactive deploy without a signer", async () => {
  let message = "";
  try {
    await createDeploySigner({ type: "none" }, defaultConfig(), {
      required: true,
      interactiveConnect: false,
      getKeyStoreProvider: () => Promise.resolve(null),
      createSigner: () => Promise.resolve(fakeSigner()),
    });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  assert(message.includes("Network deploy requires a signer"));
});
