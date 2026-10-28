/**
 * `napplet keys` command implementation.
 *
 * @module
 */

import { defaultConfig, readConfig, setSigningKeyReference, setSigningRemote, writeConfig } from "./config.ts";
import { collectFlags, first, resolveSecretInput } from "./flags.ts";
import { canPrompt } from "./interaction.ts";
import { confirm, promptRequired } from "./command-prompts.ts";
import { KEY_SERVICE_NAME, type KeyStoreProvider, requireKeyStoreProvider } from "./key-store.ts";
import {
  type ConnectOptions,
  connectRemoteSigner,
  type ConnectResult,
  DEFAULT_CONNECT_RELAYS,
} from "./nostr-connect.ts";
import type { PromptInput, PromptOutput } from "./prompt.ts";
import type { NappletConfig } from "./types.ts";
import { promptBunkerRelays } from "./bunker-relays.ts";

export interface KeysCommandOptions {
  interactive?: boolean;
  requireKeyStoreProvider?: () => Promise<KeyStoreProvider>;
  connectRemoteSigner?: (options: ConnectOptions) => Promise<ConnectResult>;
  promptConnectRelays?: (defaults: readonly string[]) => Promise<string[]>;
  promptInput?: PromptInput;
  promptOutput?: PromptOutput;
  readConfig?: (path?: string) => Promise<NappletConfig | null>;
  writeConfig?: (config: NappletConfig, path?: string) => Promise<void>;
}

export async function commandKeys(
  argv: string[],
  helpText: string,
  options: KeysCommandOptions = {},
): Promise<number> {
  const subcommand = argv[0] ?? "help";
  const rest = argv.slice(1);
  const flags = collectFlags(rest);
  const loadProvider = options.requireKeyStoreProvider ?? requireKeyStoreProvider;
  const interactive = !flags.boolean.has("non-interactive") && (options.interactive ?? canPrompt());
  const reference = async () => {
    const name = first(flags.values.get("name"));
    if (name) return name;
    if (!interactive) throw new Error("Missing --name <reference>. Run without -i in a terminal to choose a key reference.");
    return await promptRequired({ message: "Key reference name", defaultValue: "default", input: options.promptInput, output: options.promptOutput });
  };
  const projectConfig = async () => {
    const path = first(flags.values.get("config"));
    const config = await (options.readConfig ?? readConfig)(path);
    if (config) return config;
    if (interactive && await confirm("No project config found. Create one for this signer?", true)) return defaultConfig();
    throw new Error(`No .napplet config found${path ? ` at ${path}` : ""}. Run: napplet init`);
  };

  if (subcommand === "help" || subcommand === "--help" || subcommand === "-h") {
    console.log(helpText);
    return 0;
  }

  if (subcommand === "doctor") {
    const provider = await loadProvider();
    console.log(`Key storage available: ${provider.name}`);
    return 0;
  }

  if (subcommand === "connect" && !interactive) {
    throw new Error("keys connect requires an interactive signer approval. Run without -i, or use keys store -i --name <reference> --sec <secret> with an existing session.");
  }

  const provider = await loadProvider();

  if (subcommand === "store") {
    const name = await reference();
    const secret = await resolveSecretInput(flags);
    await provider.store({ service: KEY_SERVICE_NAME, account: name, secret });
    console.log(`Stored key reference "${name}" in ${provider.name}`);
    return 0;
  }

  if (subcommand === "connect") {
    const name = await reference();
    const config = await projectConfig();
    const relays = flags.values.get("relay") ?? await promptBunkerRelays({
      defaults: DEFAULT_CONNECT_RELAYS,
      promptConnectRelays: options.promptConnectRelays,
      input: options.promptInput,
      output: options.promptOutput,
      print: console.error,
    });
    const connect = options.connectRemoteSigner ?? connectRemoteSigner;
    const { nbunksec, pubkey, relays: sessionRelays } = await connect({
      relays,
      appName: "napplet CLI",
    });
    await provider.store({ service: KEY_SERVICE_NAME, account: name, secret: nbunksec });
    const path = first(flags.values.get("config"));
    await (options.writeConfig ?? writeConfig)(
      setSigningRemote(config, {
        pubkey,
        keyReference: name,
        relays: sessionRelays,
      }),
      path,
    );
    console.log(`Stored remote signer "${name}" in ${provider.name}`);
    console.log(`Configured .napplet signing.keyReference = "${name}"`);
    console.log(`Configured .napplet bunkerPubkey = "${pubkey}"`);
    console.log(`Remote signer pubkey: ${pubkey}`);
    console.log(`Session relays: ${sessionRelays.join(", ")}`);
    return 0;
  }

  if (subcommand === "list") {
    const accounts = await provider.list(KEY_SERVICE_NAME);
    if (accounts.length === 0) {
      console.log("No stored napplet keys");
      return 0;
    }
    for (const account of accounts) console.log(account);
    return 0;
  }

  if (subcommand === "use") {
    const name = await reference();
    const secret = await provider.retrieve(KEY_SERVICE_NAME, name);
    if (!secret) throw new Error(`No key reference "${name}" found in ${provider.name}`);
    const path = first(flags.values.get("config"));
    const config = await projectConfig();
    await (options.writeConfig ?? writeConfig)(setSigningKeyReference(config, name), path);
    console.log(`Configured .napplet signing.keyReference = "${name}"`);
    return 0;
  }

  if (subcommand === "delete") {
    const name = await reference();
    const deleted = await provider.delete(KEY_SERVICE_NAME, name);
    console.log(deleted ? `Deleted key reference "${name}"` : `No key reference "${name}" found`);
    return deleted ? 0 : 1;
  }

  console.error(`Unknown keys subcommand: ${subcommand}`);
  return 2;
}
