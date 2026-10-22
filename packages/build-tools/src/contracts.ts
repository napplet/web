/**
 * Platform-neutral contracts for build-time Nostr and publishing services.
 *
 * Adapters own platform capabilities such as terminal I/O, relay encryption,
 * process execution, and filesystem access. The shared package can therefore
 * be imported by both Node and Deno without reading either runtime global.
 */

const REDACTED_VALUE = "[REDACTED]";
const INSPECT = Symbol.for("nodejs.util.inspect.custom");

/** A Nostr event before a signer adds identity, ID, and signature fields. */
export interface UnsignedEvent {
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
}

/** A fully signed Nostr event returned by a signer. */
export interface SignedEvent extends UnsignedEvent {
  id: string;
  pubkey: string;
  sig: string;
}

/** The narrow signing capability used to create Blossom upload authorization. */
export interface BuildSigner {
  /**
   * Sign one Blossom authorization event.
   *
   * @param template - An unsigned event whose kind must be 24242.
   * @returns A locally verified signed event.
   * @example
   * ```ts
   * const event = await signer.signEvent({ kind: 24242, created_at: 1, tags: [], content: "upload" });
   * ```
   */
  signEvent(template: UnsignedEvent): Promise<SignedEvent>;

  /**
   * Return the verified user public key controlled by this signer.
   *
   * @returns A 64-character lowercase hexadecimal public key.
   * @example
   * ```ts
   * const pubkey = await signer.getPublicKey();
   * ```
   */
  getPublicKey(): Promise<string>;

  /**
   * Close all pending relay work owned by this signer.
   *
   * @returns A promise that resolves after cleanup is complete.
   * @example
   * ```ts
   * await signer.close();
   * ```
   */
  close(): Promise<void>;
}

/** A completed NIP-46 session whose sensitive client material stays opaque. */
export interface BuildSignerSession {
  signer: BuildSigner;
  clientSecret: RedactedSecret;
  remotePubkey: string;
  relays: string[];
}

/** Canonical NIP-46 request fields passed to an encrypted relay adapter. */
export interface Nip46Request {
  id: string;
  method: "connect" | "get_public_key" | "sign_event";
  params: string[];
  remotePubkey: string;
}

/** Canonical NIP-46 response fields returned by an encrypted relay adapter. */
export interface Nip46Response {
  id: string;
  result?: string;
  error?: string;
}

/** A cancellable relay request, normally backed by a kind-24133 subscription. */
export interface RelayRequest {
  response: Promise<Nip46Response>;
  close(): Promise<void> | void;
}

/**
 * The injected NIP-46 relay boundary. It transports canonical encrypted
 * kind-24133 traffic but does not expose relay implementation details to the
 * platform-neutral signer.
 */
export interface RelayClient {
  /**
   * Start one correlated NIP-46 request.
   *
   * @param request - Canonical method, parameters, ID, and remote signer key.
   * @param signal - Aborts the pending request and its subscription.
   * @returns A handle that exposes the matching response and deterministic cleanup.
   * @example
   * ```ts
   * const pending = relay.openRequest(request, signal);
   * ```
   */
  openRequest(request: Nip46Request, signal: AbortSignal): RelayRequest;

  /**
   * Close relay resources owned by this build session.
   *
   * @returns A promise that settles after relay cleanup.
   * @example
   * ```ts
   * await relay.close();
   * ```
   */
  close(): Promise<void>;
}

/** Time and timeout services injected for deterministic cross-runtime tests. */
export interface Clock {
  now(): number;
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}

/** A redaction-safe status record suitable for terminal and structured output. */
export interface SafeStatus {
  code: string;
  message: string;
}

/** A logger that accepts only public status records. */
export interface SafeLogger {
  info(status: SafeStatus): void;
  warn(status: SafeStatus): void;
  error(status: SafeStatus): void;
}

/** Terminal operations supplied by a runtime-specific adapter. */
export interface TerminalAdapter {
  showQr(value: string): Promise<void>;
  readLine(prompt: string, signal: AbortSignal): Promise<string>;
  writeStatus(message: SafeStatus): void;
}

/** Protected persistence for opaque session material. */
export interface SecretStore {
  get(key: string): Promise<RedactedSecret | undefined>;
  set(key: string, value: RedactedSecret): Promise<void>;
  delete(key: string): Promise<void>;
}

/** Command execution supplied by a platform adapter. */
export interface ProcessAdapter {
  run(command: string, args: readonly ProcessArgument[], input?: RedactedSecret): Promise<ProcessResult>;
}

/** One process argument, with sensitive values kept opaque to diagnostics. */
export type ProcessArgument = string | RedactedSecret;

/** The safe, bounded result of one platform command. */
export interface ProcessResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Filesystem operations supplied by a platform adapter. */
export interface FileSystemAdapter {
  readText(path: string): Promise<string>;
  writeText(path: string, contents: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

/** Dependencies needed by the least-authority NIP-46 signer core. */
export interface BuildSignerServices {
  relay: RelayClient;
  clock: Clock;
  remotePubkey: string;
  requestId(): string;
  requestTimeoutMs?: number;
  logger?: SafeLogger;
}

/**
 * Opaque sensitive material that cannot reveal itself through common output
 * paths. Consumers that must use the secret receive it only inside a callback.
 */
export class RedactedSecret {
  readonly #value: string;

  /**
   * Create an opaque secret value.
   *
   * @param value - Sensitive material that must not enter normal output.
   * @returns A value that serializes as `[REDACTED]`.
   * @example
   * ```ts
   * const secret = new RedactedSecret("nbunksec1...");
   * JSON.stringify({ secret }); // '{"secret":"[REDACTED]"}'
   * ```
   */
  constructor(value: string) {
    this.#value = value;
  }

  /**
   * Use the protected value without making it part of a status or error value.
   *
   * @param callback - Receives the secret only for a bounded operation.
   * @returns The callback result.
   * @example
   * ```ts
   * const length = secret.withValue((value) => value.length);
   * ```
   */
  withValue<T>(callback: (value: string) => T): T {
    return callback(this.#value);
  }

  toString(): string {
    return REDACTED_VALUE;
  }

  toJSON(): string {
    return REDACTED_VALUE;
  }

  [INSPECT](): string {
    return REDACTED_VALUE;
  }
}
