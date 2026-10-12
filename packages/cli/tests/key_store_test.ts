import {
  getKeyStoreProvider,
  KEY_SERVICE_NAME,
  LinuxSecretService,
  MacOSKeychain,
  requireKeyStoreProvider,
  WindowsCredentialManager,
} from "../src/key-store.ts";
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

Deno.test("MacOSKeychain stores and retrieves generic passwords", async () => {
  const calls: Array<{ command: string; args: string[]; input?: string }> = [];
  const provider = new MacOSKeychain(mockRunner({
    "which security": result(0),
    "security delete-generic-password -a default -s napplet": result(0),
    "security add-generic-password -a default -s napplet -w nsec1secret -U": result(0),
    "security find-generic-password -a default -s napplet -w": result(0, "nsec1secret\n"),
  }, calls));

  assertEquals(await provider.isAvailable(), true);
  await provider.store({ service: KEY_SERVICE_NAME, account: "default", secret: "nsec1secret" });
  assertEquals(await provider.retrieve(KEY_SERVICE_NAME, "default"), "nsec1secret");
  assertEquals(calls[1].args, ["delete-generic-password", "-a", "default", "-s", "napplet"]);
  assertEquals(calls[2].args, [
    "add-generic-password",
    "-a",
    "default",
    "-s",
    "napplet",
    "-w",
    "nsec1secret",
    "-U",
  ]);
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
  assertEquals(await provider.list(KEY_SERVICE_NAME), ["default"]);
});

Deno.test("LinuxSecretService is unavailable without DBus", async () => {
  const provider = new LinuxSecretService(mockRunner({}), {});
  assertEquals(await provider.isAvailable(), false);
});

Deno.test("WindowsCredentialManager stores, lists, and deletes targets", async () => {
  const provider = new WindowsCredentialManager(mockRunner({
    "where cmdkey": result(0),
    "cmdkey /delete:napplet:default": result(0),
    "cmdkey /add:napplet:default /user:default /pass:nsec1secret": result(0),
    "cmdkey /list": result(0, "Target: napplet:default\nTarget: other:ignored\n"),
  }));

  assertEquals(await provider.isAvailable(), true);
  await provider.store({ service: KEY_SERVICE_NAME, account: "default", secret: "nsec1secret" });
  assertEquals(await provider.list(KEY_SERVICE_NAME), ["default"]);
  assertEquals(await provider.delete(KEY_SERVICE_NAME, "default"), true);
});

Deno.test("hosts without native helpers receive encrypted local storage", async () => {
  const provider = await requireKeyStoreProvider({ os: "linux", env: {}, run: mockRunner({}) });
  assertEquals(provider.name, "encrypted local key store");
});
