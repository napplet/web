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
import type { AbstractSimplePool } from "nostr-tools/abstract-pool";
import {
  type BunkerPointer,
  BunkerSigner,
  createNostrConnectURI,
  parseBunkerInput,
} from "nostr-tools/nip46";
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { bytesToHex } from "nostr-tools/utils";
import { SimplePool } from "nostr-tools/pool";
import { encodeNbunksec, type NbunksecInfo } from "./signing.ts";

/** Default relays used to reach a remote signer when none are supplied. */
export const DEFAULT_CONNECT_RELAYS = [
  "wss://relay.nsec.app",
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
  /** Injected pool for tests; a real SimplePool is created when absent. */
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

function randomSecret(): string {
  return bytesToHex(generateSecretKey());
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
  signer: BunkerSigner;
  pubkey: string;
  relays: string[];
  secret?: string;
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
  clientSk: Uint8Array,
  uri: string,
  pool: AbstractSimplePool,
  abort: AbortSignal,
  relays: string[],
  secret: string,
): Promise<RemoteSession> {
  const signer = await BunkerSigner.fromURI(clientSk, uri, { pool }, abort);
  const pubkey = await signer.getPublicKey();
  return { signer, pubkey, relays, secret };
}

/** Paste branch: resolve once a bunker:// URL is pasted on stdin. */
async function awaitPaste(
  clientSk: Uint8Array,
  pool: AbstractSimplePool,
  abort: AbortController,
  source: ReadableStream<Uint8Array>,
  relays: string[],
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
    const pointer: BunkerPointer | null = await parseBunkerInput(bunker);
    if (!pointer) continue;
    abort.abort();
    const signer = BunkerSigner.fromBunker(clientSk, pointer, { pool });
    await signer.connect();
    const pubkey = await signer.getPublicKey();
    return {
      signer,
      pubkey,
      relays: pointer.relays.length > 0 ? pointer.relays : relays,
      secret: pointer.secret ?? undefined,
    };
  }
}

/**
 * Run the NIP-46 remote-signer login flow. Prints a nostrconnect QR and races
 * a scan (BunkerSigner.fromURI) against a pasted bunker:// URL on stdin —
 * whichever completes first wins, the loser is cancelled, and the QR is
 * cleared. On success the paired session is encoded as an nbunksec.
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
  const pool = options.pool ?? new SimplePool();

  const clientSk = generateSecretKey();
  const clientPubkey = getPublicKey(clientSk);
  const secret = randomSecret();

  const uri = createNostrConnectURI({
    clientPubkey,
    relays,
    secret,
    perms: buildPerms(kinds),
    name: options.appName ?? "napplet CLI",
  });

  const qrLines = renderQrLines(uri);
  const linesPrinted = printConnectPrompt(uri, qrLines, timeoutMs, print);

  const abort = new AbortController();
  let reader: ReadableStreamDefaultReader<string> | undefined;
  let winner: RemoteSession | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const qrTask = awaitScan(clientSk, uri, pool, abort.signal, relays, secret);
  const pasteTask = awaitPaste(
    clientSk,
    pool,
    abort,
    options.stdin ?? Deno.stdin.readable,
    relays,
    (r) => {
      reader = r;
    },
  );

  const timeoutTask = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      abort.abort();
      reject(new Error("Remote signer connection timed out"));
    }, timeoutMs);
  });

  try {
    winner = await Promise.race([qrTask, pasteTask, timeoutTask]);
    const info: NbunksecInfo = {
      pubkey: winner.pubkey,
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
    if (timer !== undefined) clearTimeout(timer);
    abort.abort();
    // Swallow the losing task so it never surfaces as an unhandled rejection.
    qrTask.then((r) => {
      if (r !== winner) void r.signer.close().catch(() => {});
    }).catch(() => {});
    pasteTask.catch(() => {});
    try {
      await reader?.cancel();
    } catch { /* best-effort */ }
    if (options.clearOnDone) clearLines(linesPrinted, writeStdout);
    try {
      await winner?.signer.close();
    } catch { /* best-effort */ }
    try {
      pool.close(relays);
    } catch { /* best-effort */ }
  }
}
