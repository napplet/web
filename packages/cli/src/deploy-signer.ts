import { bunkerRelayDefaults, promptBunkerRelays } from "./bunker-relays.ts";
import { setSigningRemote, writeConfig as writeNappletConfig } from "./config.ts";
import { getKeyStoreProvider, KEY_SERVICE_NAME, type KeyStoreProvider } from "./key-store.ts";
import {
  type ConnectOptions,
  connectRemoteSigner as connectSigner,
  type ConnectResult,
} from "./nostr-connect.ts";
import {
  type PromptInput,
  promptLine,
  type PromptOutput,
  promptSecret as promptSigningSecret,
} from "./prompt.ts";
import {
  createSignerFromSecret,
  encodePublicKey,
  type NappletSigner,
  normalizePublicKey,
} from "./signing.ts";
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
  confirmSignerMismatch?: (actualPubkey: string, expectedPubkey: string) => Promise<boolean>;
  promptConnectRelays?: (defaults: readonly string[]) => Promise<string[]>;
  promptInput?: PromptInput;
  promptOutput?: PromptOutput;
  isTerminalInput?: () => boolean;
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
    const signer = await createSigner(await promptSecret());
    await confirmPromptSignerIdentity(signer, config, options);
    return { signer, signing };
  }
  if (signing.type === "stored") {
    const provider = await getOptionalKeyStore(options);
    if (!provider) {
      return await recoverMissingStoredSigner(signing, config, options);
    }
    const secret = await provider.retrieve(KEY_SERVICE_NAME, signing.keyReference);
    if (!secret) {
      return await recoverMissingStoredSigner(signing, config, options, provider.name);
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

async function confirmPromptSignerIdentity(
  signer: NappletSigner,
  config: NappletConfig,
  options: DeploySignerOptions,
): Promise<void> {
  const expected = configuredSigningPubkey(config);
  if (!expected || normalizePublicKey(signer.pubkey) === expected) return;

  const allowed = await confirmSignerMismatch(normalizePublicKey(signer.pubkey), expected, options);
  if (allowed) return;

  throw new Error(
    `Prompted signing key ${formatPubkey(signer.pubkey)} does not match configured pubkey ${
      formatPubkey(expected)
    }`,
  );
}

function configuredSigningPubkey(config: NappletConfig): string | null {
  const pubkey = config.signing?.pubkey ?? config.bunkerPubkey;
  return pubkey ? normalizePublicKey(pubkey) : null;
}

async function confirmSignerMismatch(
  actualPubkey: string,
  expectedPubkey: string,
  options: DeploySignerOptions,
): Promise<boolean> {
  if (options.confirmSignerMismatch) {
    return await options.confirmSignerMismatch(actualPubkey, expectedPubkey);
  }

  const print = options.print ?? console.error;
  print("");
  print(
    `The prompted signing key belongs to ${
      formatPubkey(actualPubkey)
    }, but this project is configured for ${formatPubkey(expectedPubkey)}.`,
  );
  print("This may be the wrong key.");

  const interactive = options.isTerminalInput?.() ?? (Deno.stdin.isTerminal?.() ?? false);
  if (!interactive) return false;

  const answer = await promptLine({
    message: "Continue with this signer?",
    defaultValue: "no",
  });
  return answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes";
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

async function recoverMissingStoredSigner(
  signing: { type: "stored"; source: "config"; keyReference: string },
  config: NappletConfig,
  options: DeploySignerOptions,
  providerName?: string,
): Promise<DeploySignerResult> {
  if (!options.required) return { signer: null, signing };

  const expected = configuredSigningPubkey(config);
  if (expected && options.interactiveConnect) {
    const print = options.print ?? (() => {});
    print(
      `No stored signer "${signing.keyReference}"${
        providerName ? ` found in ${providerName}` : ""
      }. Reconnecting to configured bunker ${formatPubkey(expected)}...`,
    );
    return await connectAndCreateSigner(config, options, expected, config.signing?.relays);
  }

  if (expected) {
    throw new Error(
      `No key reference "${signing.keyReference}"${
        providerName ? ` found in ${providerName}` : ""
      } for configured bunker ${
        formatPubkey(expected)
      }. Run napplet deploy in an interactive terminal to reconnect, pass --sec/--prompt-sec, or run napplet keys connect.`,
    );
  }

  if (!providerName) {
    throw new Error(
      "No native keychain provider is available. Install macOS security, Windows Credential Manager/cmdkey, or Linux libsecret secret-tool with a D-Bus session.",
    );
  }

  throw new Error(`No key reference "${signing.keyReference}" found in ${providerName}`);
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
  const relayDefaults = bunkerRelayDefaults(preferredRelays);

  print(
    expectedPubkey
      ? `Starting Nostr Connect for configured bunker ${formatPubkey(expectedPubkey)}...`
      : "No deploy signer is configured. Starting Nostr Connect...",
  );
  const relays = await promptBunkerRelays({
    defaults: relayDefaults,
    promptConnectRelays: options.promptConnectRelays,
    input: options.promptInput,
    output: options.promptOutput,
    print,
  });
  print(`Using bunker relay${relays.length === 1 ? "" : "s"}: ${relays.join(", ")}`);
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

async function getOptionalKeyStore(
  options: DeploySignerOptions,
): Promise<KeyStoreProvider | null> {
  const load = options.getKeyStoreProvider ?? getKeyStoreProvider;
  return await load();
}

function requireSec(sec: string | undefined): string {
  if (!sec) throw new Error("Missing --sec");
  return sec;
}

function formatPubkey(pubkey: string): string {
  try {
    const npub = encodePublicKey(pubkey);
    return `${npub.slice(0, 12)}...${npub.slice(-8)}`;
  } catch {
    return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`;
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
