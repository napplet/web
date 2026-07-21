// nostr-connect.ts
//
// NIP-46 remote-signer onboarding for the napplet CLI signer.
//
// This module implements the standard Nostr Remote Signing handshake (NIP-46:
// nostrconnect:// QR + bunker:// paste) so a developer can pair a remote signer
// (e.g. a phone app) for CLI signing without pasting a raw nsec. The paired
// session is encoded as an `nbunksec` that the existing sign-time path
// (createNbunksecSigner in signing.ts) consumes.
//
// This is Nostr signer transport ONLY. It is entirely separate from the
// napplet <-> shell protocol (NIP-5D / NAPs). It MUST NOT touch, invent, or
// depend on any NIP-5D / NAP wire surface, `napplet-*` manifest tags, the
// iframe srcdoc/sandbox model, or the napplet artifact shape.

import { qrcode } from "@libs/qrcode";
import { TextLineStream } from "@std/streams";
import { NostrConnectSigner, PrivateKeySigner } from "applesauce-signers";
import type { AbstractSimplePool } from "nostr-tools/abstract-pool";
import { generateSecretKey } from "nostr-tools/pure";
import { bytesToHex } from "nostr-tools/utils";
import { createApplesaucePool } from "./applesauce-pool.ts";
import { closeNostrConnectPool, ensureNostrConnectPool } from "./nostr-connect-pool.ts";
import { encodeNbunksec, type NbunksecInfo } from "./signing.ts";

/** Default relays used to reach a remote signer when none are supplied. */
export const DEFAULT_CONNECT_RELAYS = [
  "wss://bucket.coracle.social",
] as const;

/**
 * Event kinds the CLI asks a remote signer to authorize. Covers the NIP-5A
 * manifest events plus the Blossom upload-authorization kind used by deploy.
 */
export const DEFAULT_CONNECT_KINDS = [5129, 15129, 35129, 24242] as const;

/** Overall wait before the connect flow gives up (2 minutes). */
export const DEFAULT_CONNECT_TIMEOUT_MS = 120_000;

export interface ConnectOptions {
  /** Relays the client listens on for the remote signer's response. */
  relays: string[];
  /** Human-facing app name shown in the remote signer. */
  appName?: string;
  /** Event kinds to request `sign_event` permission for. */
  kinds?: number[];
  /** Overall timeout in milliseconds (default 120_000). */
  timeoutMs?: number;
  /** Injected nostr-tools pool for tests; real flows use the applesauce RelayPool. */
  pool?: AbstractSimplePool;
  /** Injected stdin for tests; Deno.stdin.readable is used when absent. */
  stdin?: ReadableStream<Uint8Array>;
  /** Sink for printed lines (QR + prompts); defaults to console.log. */
  print?: (line: string) => void;
  /** When true, ANSI-clear the QR after the flow settles. */
  clearOnDone?: boolean;
  /** Low-level writer used for ANSI clearing; defaults to Deno.stdout. */
  writeStdout?: (bytes: Uint8Array) => void;
}

export interface ConnectResult {
  /** Encoded nbunksec ready to store in the keychain. */
  nbunksec: string;
  /** Remote signer public key (hex). */
  pubkey: string;
  /** Relays the session was established on. */
  relays: string[];
}

/**
 * Build the NIP-46 permission list requested from a remote signer.
 *
 * @param kinds - Event kinds to request `sign_event` permission for.
 * @returns A leading `get_public_key` followed by one `sign_event:<kind>` per kind.
 * @example
 * ```ts
 * buildPerms([1, 24242]); // ["get_public_key", "sign_event:1", "sign_event:24242"]
 * ```
 */
export function buildPerms(kinds: number[]): string[] {
  return ["get_public_key", ...kinds.map((kind) => `sign_event:${kind}`)];
}

/**
 * Detect whether a stdin line is a pasted `bunker://` connection string.
 *
 * @param line - A single line read from stdin.
 * @returns The trimmed `bunker://` string, or null when the line is not one.
 * @example
 * ```ts
 * detectBunkerLine("  bunker://abc "); // "bunker://abc"
 * detectBunkerLine("noise");           // null
 * ```
 */
export function detectBunkerLine(line: string): string | null {
  const trimmed = line.trim();
  return trimmed.startsWith("bunker://") ? trimmed : null;
}

/**
 * Render a QR module matrix to terminal lines using half-block characters,
 * two QR rows per printed line, wrapped in a quiet-zone border.
 *
 * @param matrix - Boolean matrix where true = dark module.
 * @param border - Quiet-zone size in modules (default 2).
 * @returns One string per printed terminal row.
 * @example
 * ```ts
 * renderQrMatrix([[true, false], [false, true]]).length; // > 0
 * ```
 */
export function renderQrMatrix(matrix: boolean[][], border = 2): string[] {
  if (!matrix || matrix.length === 0) return [];
  const UPPER_HALF = "▀";
  const LOWER_HALF = "▄";
  const FULL_BLOCK = "█";
  const SPACE = " ";
  const width = matrix[0].length;
  const totalWidth = width + 2 * border;
  const lines: string[] = [];

  for (let i = 0; i < Math.ceil(border / 2); i += 1) lines.push(SPACE.repeat(totalWidth));

  for (let row = 0; row < matrix.length; row += 2) {
    const top = matrix[row];
    const bottom = row + 1 < matrix.length ? matrix[row + 1] : null;
    let line = SPACE.repeat(border);
    for (let col = 0; col < width; col += 1) {
      const topDark = top[col];
      const bottomDark = bottom ? bottom[col] : false;
      if (topDark && bottomDark) line += FULL_BLOCK;
      else if (topDark && !bottomDark) line += UPPER_HALF;
      else if (!topDark && bottomDark) line += LOWER_HALF;
      else line += SPACE;
    }
    line += SPACE.repeat(border);
    lines.push(line);
  }

  for (let i = 0; i < Math.ceil(border / 2); i += 1) lines.push(SPACE.repeat(totalWidth));
  return lines;
}

/**
 * Render a nostrconnect:// URI as a scannable QR code for the terminal.
 *
 * @param uri - The nostrconnect:// URI to encode.
 * @param border - Quiet-zone size in modules (default 2).
 * @returns One string per printed terminal row.
 * @example
 * ```ts
 * renderQrLines("nostrconnect://pubkey?relay=wss://r").length; // > 0
 * ```
 */
export function renderQrLines(uri: string, border = 2): string[] {
  const matrix = qrcode(uri, { output: "array" }) as boolean[][];
  return renderQrMatrix(matrix, border);
}

function clearLines(count: number, write: (bytes: Uint8Array) => void): void {
  if (count <= 0) return;
  const encoder = new TextEncoder();
  write(encoder.encode(`\x1b[${count}A`));
  for (let i = 0; i < count; i += 1) write(encoder.encode("\x1b[2K\x1b[B"));
  write(encoder.encode(`\x1b[${count}A`));
}

/** A connected remote-signer session produced by either race branch. */
interface RemoteSession {
  signer: NostrConnectSigner;
  pubkey: string;
  remotePubkey: string;
  relays: string[];
  secret?: string;
}

interface ConnectCleanupOptions {
  abort: AbortController;
  clearOnDone?: boolean;
  injectedPool?: AbstractSimplePool;
  linesPrinted: number;
  pasteTask: Promise<RemoteSession>;
  qrTask: Promise<RemoteSession>;
  reader?: ReadableStreamDefaultReader<string>;
  relays: string[];
  timer?: ReturnType<typeof setTimeout>;
  winner?: RemoteSession;
  writeStdout: (bytes: Uint8Array) => void;
}

/** Print the QR + prompt block; returns the number of terminal lines written. */
function printConnectPrompt(
  uri: string,
  qrLines: string[],
  timeoutMs: number,
  print: (line: string) => void,
): number {
  print("Scan this QR with a NIP-46 signer, or paste a bunker:// URL and press Enter:");
  for (const line of qrLines) print(line);
  print("");
  print(uri);
  print(`Waiting for a remote signer (timeout ${Math.round(timeoutMs / 1000)}s)...`);
  return qrLines.length + 4;
}

/** QR branch: resolve once a remote signer scans the nostrconnect:// URI. */
async function awaitScan(
  signer: NostrConnectSigner,
  abort: AbortSignal,
): Promise<RemoteSession> {
  await signer.waitForSigner(abort);
  const remotePubkey = signer.remote;
  if (!remotePubkey) throw new Error("Remote signer did not identify itself");
  const pubkey = await signer.getPublicKey();
  return { signer, pubkey, remotePubkey, relays: signer.relays, secret: signer.secret };
}

/** Paste branch: resolve once a bunker:// URL is pasted on stdin. */
async function awaitPaste(
  clientSk: Uint8Array,
  pool: AbstractSimplePool | undefined,
  abort: AbortController,
  source: ReadableStream<Uint8Array>,
  relays: string[],
  permissions: string[],
  onReader: (reader: ReadableStreamDefaultReader<string>) => void,
): Promise<RemoteSession> {
  const lines = source
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream());
  const reader = lines.getReader();
  onReader(reader);
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return await new Promise<never>(() => {});
    if (value === undefined) continue;
    const bunker = detectBunkerLine(value);
    if (!bunker) continue;
    let pointer: { remote: string; relays: string[]; secret?: string };
    try {
      pointer = NostrConnectSigner.parseBunkerURI(bunker);
    } catch {
      continue;
    }
    abort.abort();
    const signer = await NostrConnectSigner.fromBunkerURI(bunker, {
      signer: new PrivateKeySigner(clientSk),
      permissions,
      ...(pool ? { pool: createApplesaucePool(pool) } : {}),
    });
    const pubkey = await signer.getPublicKey();
    return {
      signer,
      pubkey,
      remotePubkey: pointer.remote,
      relays: pointer.relays.length > 0 ? pointer.relays : relays,
      secret: pointer.secret ?? undefined,
    };
  }
}

/**
 * Run the NIP-46 remote-signer login flow. Prints a nostrconnect QR and races
 * a scan against a pasted bunker:// URL on stdin. Whichever completes first
 * wins, the loser is cancelled, and the QR is cleared. On success the paired
 * session is encoded as an nbunksec.
 *
 * @param options - Relays, app name, timeout, and optional injected pool/stdin.
 * @returns The encoded nbunksec, remote pubkey, and session relays.
 * @example
 * ```ts
 * const { nbunksec, pubkey } = await connectRemoteSigner({
 *   relays: DEFAULT_CONNECT_RELAYS.slice(),
 *   appName: "napplet CLI",
 * });
 * ```
 */
export async function connectRemoteSigner(options: ConnectOptions): Promise<ConnectResult> {
  const relays = options.relays.length > 0 ? options.relays : DEFAULT_CONNECT_RELAYS.slice();
  const kinds = options.kinds ?? DEFAULT_CONNECT_KINDS.slice();
  const timeoutMs = options.timeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
  const print = options.print ?? ((line: string) => console.log(line));
  const writeStdout = options.writeStdout ??
    ((bytes: Uint8Array) => Deno.stdout.writeSync(bytes));
  const injectedPool = options.pool;
  if (!injectedPool) ensureNostrConnectPool();

  const clientSk = generateSecretKey();
  const permissions = buildPerms(kinds);
  const qrSigner = new NostrConnectSigner({
    relays,
    signer: new PrivateKeySigner(clientSk),
    ...(injectedPool ? { pool: createApplesaucePool(injectedPool) } : {}),
  });

  const uri = qrSigner.getNostrConnectURI({
    name: options.appName ?? "napplet CLI",
    permissions,
  });

  const qrLines = renderQrLines(uri);
  const linesPrinted = printConnectPrompt(uri, qrLines, timeoutMs, print);

  const abort = new AbortController();
  let reader: ReadableStreamDefaultReader<string> | undefined;
  let winner: RemoteSession | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const qrTask = awaitScan(qrSigner, abort.signal);
  const pasteTask = awaitPaste(
    clientSk,
    injectedPool,
    abort,
    options.stdin ?? Deno.stdin.readable,
    relays,
    permissions,
    (r) => {
      reader = r;
    },
  );
  const ignoredQrTask = qrTask.catch(() => new Promise<never>(() => {}));
  const ignoredPasteTask = pasteTask.catch((error) => {
    if (abort.signal.aborted) return new Promise<never>(() => {});
    throw error;
  });

  const timeoutTask = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      abort.abort();
      reject(new Error("Remote signer connection timed out"));
    }, timeoutMs);
  });

  try {
    winner = await Promise.race([ignoredQrTask, ignoredPasteTask, timeoutTask]);
    const info: NbunksecInfo = {
      pubkey: winner.remotePubkey,
      localKey: bytesToHex(clientSk),
      relays: winner.relays,
      secret: winner.secret,
    };
    return {
      nbunksec: encodeNbunksec(info),
      pubkey: winner.pubkey,
      relays: winner.relays,
    };
  } finally {
    await cleanupConnectFlow({
      abort,
      clearOnDone: options.clearOnDone,
      injectedPool,
      linesPrinted,
      pasteTask,
      qrTask,
      reader,
      relays,
      timer,
      winner,
      writeStdout,
    });
  }
}

async function cleanupConnectFlow(options: ConnectCleanupOptions): Promise<void> {
  if (options.timer !== undefined) clearTimeout(options.timer);
  options.abort.abort();
  // Swallow the losing task so it never surfaces as an unhandled rejection.
  options.qrTask.then((r) => {
    if (r !== options.winner) void r.signer.close().catch(() => {});
  }).catch(() => {});
  options.pasteTask.catch(() => {});
  try {
    await options.reader?.cancel();
  } catch { /* best-effort */ }
  if (options.clearOnDone) clearLines(options.linesPrinted, options.writeStdout);
  try {
    await options.winner?.signer.close();
  } catch { /* best-effort */ }
  try {
    if (options.injectedPool) options.injectedPool.close(options.relays);
    else closeNostrConnectPool();
  } catch { /* best-effort */ }
}
