import {
  createKeyStore,
  getKeyStoreProvider,
  KEY_SERVICE_NAME,
  type KeyStoreProvider,
  LinuxSecretService,
  MacOSKeychain,
  requireKeyStoreProvider,
  type StoredSecret,
  WindowsCredentialManager,
} from "../src/key-store.ts";
import { RedactedSecret } from "@napplet/build-tools";
import type { CommandResult, CommandRunner } from "../src/process.ts";
import { assert, assertEquals } from "./assert.ts";

function result(code: number, stdout = "", stderr = ""): CommandResult {
  return { code, stdout, stderr };
}

function mockRunner(
  responses: Record<string, CommandResult>,
  calls: Array<{ command: string; args: string[]; input?: string }> = [],
): CommandRunner {
  return (command, args, options) => {
    calls.push({ command, args, input: options?.input });
    const key = `${command} ${args.join(" ")}`;
    return Promise.resolve(responses[key] ?? result(1, "", `missing mock: ${key}`));
  };
}

Deno.test("getKeyStoreProvider returns null when disabled", async () => {
  const provider = await getKeyStoreProvider({
    os: "darwin",
    env: { NAPPLET_DISABLE_KEYCHAIN: "true" },
    run: mockRunner({}),
  });
  assertEquals(provider, null);
});

Deno.test("requireKeyStoreProvider fails closed when storage is explicitly disabled", async () => {
  let message = "";
  try {
    await requireKeyStoreProvider({
      os: "linux",
      env: { NAPPLET_DISABLE_KEYCHAIN: "true" },
      run: mockRunner({}),
    });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert(message.includes("Key storage is disabled"));
});

Deno.test("argv-only macOS and Windows credential writers remain unavailable", async () => {
  const secret = "nbunksec1must-not-enter-argv";
  for (const Provider of [MacOSKeychain, WindowsCredentialManager]) {
    const calls: Array<{ command: string; args: string[]; input?: string }> = [];
    const provider = new Provider(mockRunner({}, calls));

    assertEquals(await provider.isAvailable(), false);
    await provider.store({ service: KEY_SERVICE_NAME, account: "default", secret }).then(
      () => {
        throw new Error(`${provider.name} write must be unavailable`);
      },
      () => {},
    );
    assertEquals(calls.length, 0);
    assert(!calls.some((call) => call.args.some((arg) => arg.includes(secret))));
  }
});

Deno.test("LinuxSecretService requires DBus and writes secret through stdin", async () => {
  const calls: Array<{ command: string; args: string[]; input?: string }> = [];
  const provider = new LinuxSecretService(
    mockRunner({
      "which secret-tool": result(0),
      "secret-tool search service napplet-probe": result(1),
      "secret-tool store --label napplet - default service napplet account default": result(0),
      "secret-tool search service napplet": result(
        0,
        "label = napplet - default\nattribute.account = default\n",
      ),
    }, calls),
    { DBUS_SESSION_BUS_ADDRESS: "unix:path=/tmp/bus" },
  );

  assertEquals(await provider.isAvailable(), true);
  await provider.store({
    service: KEY_SERVICE_NAME,
    account: "default",
    secret: "nbunksec1secret",
  });
  assertEquals(calls[2].input, "nbunksec1secret");
  assert(!calls[2].args.some((arg) => arg.includes("nbunksec1secret")));
  assertEquals(await provider.list(KEY_SERVICE_NAME), ["default"]);
});

Deno.test("LinuxSecretService is unavailable without DBus", async () => {
  const provider = new LinuxSecretService(mockRunner({}), {});
  assertEquals(await provider.isAvailable(), false);
});

Deno.test("createKeyStore adapts an existing provider to the shared opaque SecretStore", async () => {
  const stored: StoredSecret[] = [];
  const provider: KeyStoreProvider = {
    name: "test key store",
    isAvailable: () => Promise.resolve(true),
    store: (secret) => {
      stored.push(secret);
      return Promise.resolve();
    },
    retrieve: (_service, account) =>
      Promise.resolve(account === "remote" ? "nbunksec1secret" : null),
    delete: () => Promise.resolve(true),
    list: () => Promise.resolve([]),
  };
  const store = createKeyStore(provider);

  const retrieved = await store.get("remote");
  assertEquals(retrieved?.withValue((value) => value), "nbunksec1secret");
  assertEquals(String(retrieved), "[REDACTED]");
  await store.set("remote", new RedactedSecret("nbunksec1replacement"));
  await store.delete("remote");

  assertEquals(stored, [{
    service: KEY_SERVICE_NAME,
    account: "remote",
    secret: "nbunksec1replacement",
  }]);
});

Deno.test("hosts without native helpers receive encrypted local storage", async () => {
  const provider = await requireKeyStoreProvider({ os: "linux", env: {}, run: mockRunner({}) });
  assertEquals(provider.name, "encrypted local key store");
});
