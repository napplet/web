import { setSigningRemote, writeConfig as writeNappletConfig } from "./config.ts";
import { getKeyStoreProvider, KEY_SERVICE_NAME, type KeyStoreProvider } from "./key-store.ts";
import {
  type ConnectOptions,
  connectRemoteSigner as connectSigner,
  type ConnectResult,
  DEFAULT_CONNECT_RELAYS,
} from "./nostr-connect.ts";
import { promptSecret as promptSigningSecret } from "./prompt.ts";
import { createSignerFromSecret, encodePublicKey, type NappletSigner } from "./signing.ts";
import type { NappletConfig, SigningMethod } from "./types.ts";

export interface DeploySignerResult {
  signer: NappletSigner | null;
  signing: SigningMethod;
}

export interface DeploySignerOptions {
  sec?: string;
  env?: Record<string, string | undefined>;
  required?: boolean;
  interactiveConnect?: boolean;
  configPath?: string;
  promptSecret?: () => Promise<string>;
  getKeyStoreProvider?: () => Promise<KeyStoreProvider | null>;
  connectRemoteSigner?: (options: ConnectOptions) => Promise<ConnectResult>;
  createSigner?: (secret: string) => Promise<NappletSigner>;
  writeConfig?: (config: NappletConfig, path?: string) => Promise<void>;
  print?: (line: string) => void;
  writePromptBytes?: (bytes: Uint8Array) => void;
}

/** create deploy signer helper for network deploy signing. */
export async function createDeploySigner(
  signing: SigningMethod,
  config: NappletConfig,
  options: DeploySignerOptions = {},
): Promise<DeploySignerResult> {
  const createSigner = options.createSigner ?? createSignerFromSecret;
  if (signing.type === "private-key") {
    return { signer: await createSigner(requireSec(options.sec)), signing };
  }
  if (signing.type === "bunker") {
    return { signer: await createSigner(requireSec(options.sec)), signing };
  }
  if (signing.type === "prompt") {
    const promptSecret = options.promptSecret ?? promptSigningSecret;
    return { signer: await createSigner(await promptSecret()), signing };
  }
  if (signing.type === "stored") {
    const provider = await requireDeployKeyStore(options);
    const secret = await provider.retrieve(KEY_SERVICE_NAME, signing.keyReference);
    if (!secret) {
      throw new Error(`No key reference "${signing.keyReference}" found in ${provider.name}`);
    }
    return { signer: await createSigner(secret), signing };
  }
  if (signing.type === "ci-revocable") {
    const env = options.env ?? Deno.env.toObject();
    return {
      signer: await createSigner(env[signing.keyReference] ?? signing.keyReference),
      signing,
    };
  }
  if (signing.type === "bunker-pubkey") {
    const found = await retrieveBunkerSecret(signing.pubkey, options);
    if (found) {
      return {
        signer: await createSigner(found.secret),
        signing: { type: "stored", source: "config", keyReference: found.account },
      };
    }
    if (options.required && options.interactiveConnect) {
      return await connectAndCreateSigner(config, options, signing.pubkey, signing.relays);
    }
    if (options.required) {
      throw new Error(
        "No stored bunker session found for configured pubkey. Run napplet deploy in an interactive terminal, pass --sec/--prompt-sec, or run napplet keys connect.",
      );
    }
    return { signer: null, signing };
  }

  if (options.required && options.interactiveConnect) {
    return await connectAndCreateSigner(config, options);
  }
  if (options.required) {
    throw new Error(
      "Network deploy requires a signer. Run in an interactive terminal, pass --sec/--prompt-sec, or configure signing.keyReference.",
    );
  }
  return { signer: null, signing };
}

async function retrieveBunkerSecret(
  pubkey: string,
  options: DeploySignerOptions,
): Promise<{ account: string; secret: string } | null> {
  const provider = await getOptionalKeyStore(options);
  if (!provider) return null;
  for (const account of [pubkey, encodePublicKey(pubkey)]) {
    const secret = await provider.retrieve(KEY_SERVICE_NAME, account);
    if (secret) return { account, secret };
  }
  return null;
}

async function connectAndCreateSigner(
  config: NappletConfig,
  options: DeploySignerOptions,
  expectedPubkey?: string,
  preferredRelays?: readonly string[],
): Promise<DeploySignerResult> {
  const print = options.print ?? (() => {});
  const connectRemoteSigner = options.connectRemoteSigner ?? connectSigner;
  const createSigner = options.createSigner ?? createSignerFromSecret;
  const relays = connectRelays(config, preferredRelays);

  print("No deploy signer is configured. Starting Nostr Connect...");
  const result = await connectRemoteSigner({
    relays,
    appName: "napplet CLI",
    print,
    writeStdout: options.writePromptBytes,
  });

  if (expectedPubkey && result.pubkey !== expectedPubkey) {
    throw new Error(
      `Connected bunker pubkey ${result.pubkey} does not match configured pubkey ${expectedPubkey}`,
    );
  }

  const stored = await storeConnectedSigner(result, options);
  const writeConfig = options.writeConfig ?? writeNappletConfig;
  await writeConfig(
    setSigningRemote(config, {
      pubkey: result.pubkey,
      keyReference: stored ? result.pubkey : undefined,
      relays: result.relays,
    }),
    options.configPath,
  );
  print(
    stored
      ? `Stored remote signer session as key reference "${result.pubkey}".`
      : "No native keychain provider is available; using this signer for the current deploy only.",
  );
  print("Configured .napplet signing for this remote signer.");

  return {
    signer: await createSigner(result.nbunksec),
    signing: stored
      ? { type: "stored", source: "config", keyReference: result.pubkey }
      : { type: "bunker-pubkey", source: "config", pubkey: result.pubkey, relays: result.relays },
  };
}

async function storeConnectedSigner(
  result: ConnectResult,
  options: DeploySignerOptions,
): Promise<boolean> {
  const print = options.print ?? (() => {});
  const provider = await getOptionalKeyStore(options);
  if (!provider) return false;
  try {
    await provider.store({
      service: KEY_SERVICE_NAME,
      account: result.pubkey,
      secret: result.nbunksec,
    });
    return true;
  } catch (error) {
    print(`Could not store remote signer in ${provider.name}: ${message(error)}`);
    return false;
  }
}

async function requireDeployKeyStore(options: DeploySignerOptions): Promise<KeyStoreProvider> {
  const provider = await getOptionalKeyStore(options);
  if (!provider) {
    throw new Error(
      "No native keychain provider is available. Install macOS security, Windows Credential Manager/cmdkey, or Linux libsecret secret-tool with a D-Bus session.",
    );
  }
  return provider;
}

async function getOptionalKeyStore(
  options: DeploySignerOptions,
): Promise<KeyStoreProvider | null> {
  const load = options.getKeyStoreProvider ?? getKeyStoreProvider;
  return await load();
}

function connectRelays(config: NappletConfig, preferredRelays?: readonly string[]): string[] {
  const relays = preferredRelays && preferredRelays.length > 0
    ? preferredRelays
    : config.signing?.relays && config.signing.relays.length > 0
    ? config.signing.relays
    : config.relays.length > 0
    ? config.relays
    : DEFAULT_CONNECT_RELAYS;
  return [...relays];
}

function requireSec(sec: string | undefined): string {
  if (!sec) throw new Error("Missing --sec");
  return sec;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
