/** Abortable terminal coordination for NIP-46 QR and bunker pairing. */

import { RedactedSecret } from "./contracts.ts";
import type {
  BuildSignerSession,
  Clock,
  SecretStore,
  TerminalAdapter,
} from "./contracts.ts";

/** Stable secret-store key shared by reconnect and fresh pairing. */
export const BUILD_SIGNER_SESSION_KEY = "napplet-build-signer";
const DEFAULT_PAIRING_TIMEOUT_MS = 120_000;
const PUBLIC_KEY_PATTERN = /^[0-9a-f]{64}$/;

/** A pending client-initiated NIP-46 pairing shown as a nostrconnect QR/deep-link. */
export interface QrPairing {
  /** The `nostrconnect://` value for the terminal QR renderer. */
  uri: string;
  /** Wait for the remote signer to accept the client-initiated connection. */
  waitForSession(signal: AbortSignal): Promise<BuildSignerSession>;
  /** Stop only resources owned by this pending pairing. */
  close(): Promise<void> | void;
}

/** A parsed stored NIP-46 session identity used to bind a reconnect. */
export interface StoredSessionIdentity {
  remotePubkey: string;
  relays: readonly string[];
}

/** Dependencies for a QR/deep-link and pasted-bunker first-success race. */
export interface PairBuildSignerOptions {
  terminal: TerminalAdapter;
  clock: Clock;
  createQrPairing(signal: AbortSignal): QrPairing | Promise<QrPairing>;
  connectBunker(bunker: RedactedSecret, signal: AbortSignal): Promise<BuildSignerSession>;
  secretStore?: SecretStore;
  sessionKey?: string;
  timeoutMs?: number;
}

/** Dependencies for validated stored-session reconnect. */
export interface ReconnectBuildSignerOptions {
  secretStore: SecretStore;
  parseStoredSession(secret: RedactedSecret): StoredSessionIdentity;
  reconnect(secret: RedactedSecret, identity: StoredSessionIdentity, signal: AbortSignal): Promise<BuildSignerSession>;
  sessionKey?: string;
}

/**
 * Race client-initiated `nostrconnect://` pairing against operator-pasted
 * `bunker://` input, persist only the verified winner, and stop losing work.
 *
 * @param options - Injected terminal, clock, relay-pairing, and store adapters.
 * @returns A verified signer session.
 * @example
 * ```ts
 * const session = await pairBuildSigner({ terminal, clock, createQrPairing, connectBunker });
 * ```
 */
export async function pairBuildSigner(options: PairBuildSignerOptions): Promise<BuildSignerSession> {
  const root = new AbortController();
  const qrController = new AbortController();
  const pasteController = new AbortController();
  const linkAbort = (controller: AbortController): void => {
    root.signal.addEventListener("abort", () => controller.abort(), { once: true });
  };
  linkAbort(qrController);
  linkAbort(pasteController);
  const pairing = await options.createQrPairing(qrController.signal);
  const timeout = options.clock.setTimeout(() => root.abort(), options.timeoutMs ?? DEFAULT_PAIRING_TIMEOUT_MS);
  let winner: "qr" | "paste" | undefined;
  let verifiedSession: BuildSignerSession | undefined;
  const claimWinner = async (flow: "qr" | "paste", session: BuildSignerSession): Promise<BuildSignerSession> => {
    if (winner !== undefined) {
      await session.signer.close();
      throw new Error("Remote signer pairing lost");
    }
    winner = flow;
    return session;
  };

  try {
    await options.terminal.showQr(pairing.uri);
    options.terminal.writeStatus({ code: "signer-pairing", message: "Waiting for a remote signer" });
    const qr = pairing.waitForSession(qrController.signal).then(async (session) => {
      const verified = await verifySession(session);
      return await claimWinner("qr", verified);
    });
    const pasted = options.terminal.readLine("Paste a bunker:// URL: ", pasteController.signal)
      .then(async (value) => {
        const bunker = new RedactedSecret(value.trim());
        if (!bunker.withValue((raw) => raw.startsWith("bunker://"))) {
          throw new Error("Invalid bunker connection");
        }
        const session = await options.connectBunker(bunker, pasteController.signal);
        const verified = await verifySession(session);
        return await claimWinner("paste", verified);
      });
    const session = await Promise.any([qr, pasted]).catch(() => {
      throw new Error(root.signal.aborted ? "Remote signer pairing timed out" : "Remote signer pairing failed");
    });
    verifiedSession = session;
    root.abort();
    if (options.secretStore) await options.secretStore.set(options.sessionKey ?? BUILD_SIGNER_SESSION_KEY, session.clientSecret);
    options.terminal.writeStatus({
      code: "signer-paired",
      message: `Remote signer paired (${abbreviatePublicKey(session.remotePubkey)})`,
    });
    return session;
  } catch (error) {
    if (winner === "qr" || winner === "paste") {
      await verifiedSession?.signer.close();
      verifiedSession = undefined;
      // A verified session can still fail only during protected persistence.
      // Its secret remains opaque and the caller receives a generic failure.
      throw new Error("Remote signer session could not be saved");
    }
    throw error instanceof Error && error.message === "Remote signer pairing timed out"
      ? error
      : new Error("Remote signer pairing failed");
  } finally {
    options.clock.clearTimeout(timeout);
    root.abort();
    if (winner !== "qr") await pairing.close();
  }
}

/**
 * Load the stable stored session, parse its public binding before reconnecting,
 * and return undefined when no valid reusable session remains.
 *
 * @param options - Injected store, parser, and reconnect adapter.
 * @returns A verified session or undefined without mutating the store.
 * @example
 * ```ts
 * const session = await reconnectBuildSigner({ secretStore, parseStoredSession, reconnect });
 * ```
 */
export async function reconnectBuildSigner(
  options: ReconnectBuildSignerOptions,
): Promise<BuildSignerSession | undefined> {
  const secret = await options.secretStore.get(options.sessionKey ?? BUILD_SIGNER_SESSION_KEY);
  if (!secret) return undefined;
  try {
    const identity = options.parseStoredSession(secret);
    if (!isIdentity(identity)) return undefined;
    const controller = new AbortController();
    const session = await options.reconnect(secret, identity, controller.signal);
    return await verifySession(session, identity);
  } catch {
    return undefined;
  }
}

function isIdentity(identity: StoredSessionIdentity): boolean {
  return PUBLIC_KEY_PATTERN.test(identity.remotePubkey) &&
    identity.relays.length > 0 && identity.relays.every((relay) => relay.startsWith("wss://"));
}

async function verifySession(
  session: BuildSignerSession,
  expected?: StoredSessionIdentity,
): Promise<BuildSignerSession> {
  if (!PUBLIC_KEY_PATTERN.test(session.remotePubkey) || !session.relays.length ||
    !session.relays.every((relay) => relay.startsWith("wss://")) ||
    !session.clientSecret.withValue((secret) => secret.startsWith("nbunksec1"))) {
    await session.signer.close();
    throw new Error("Remote signer session verification failed");
  }
  if (expected && (session.remotePubkey !== expected.remotePubkey ||
    session.relays.length !== expected.relays.length ||
    session.relays.some((relay, index) => relay !== expected.relays[index]))) {
    await session.signer.close();
    throw new Error("Remote signer session verification failed");
  }
  const publicKey = await session.signer.getPublicKey();
  if (!PUBLIC_KEY_PATTERN.test(publicKey)) {
    await session.signer.close();
    throw new Error("Remote signer session verification failed");
  }
  return session;
}

function abbreviatePublicKey(publicKey: string): string {
  return `${publicKey.slice(0, 8)}…${publicKey.slice(-8)}`;
}
