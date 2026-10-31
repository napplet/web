/** User-selected, runtime-mediated inference from the living NAP-LLM proposal: https://github.com/napplet/naps/pull/134. */

/** Conversation role of one message. */
export type LlmRole = 'system' | 'user' | 'assistant';

/** Requested output format. `json` requires a JSON object, not an array or scalar. */
export type LlmFormat = 'text' | 'json';

/** Declared encoding of an inline image part. */
export type LlmImageMimeType = 'image/png' | 'image/jpeg' | 'image/webp';

/** Why a generation ended. Only `stop` is normal completion. */
export type LlmFinish = 'stop' | 'length' | 'refusal';

/**
 * NAP-LLM error codes. The specification requires callers to treat unknown
 * codes as failures, so the type stays open while the known set is listed.
 */
export type LlmErrorCode =
  | 'unsupported'
  | 'invalid-request'
  | 'selection-expired'
  | 'user-cancelled'
  | 'cancelled'
  | 'timeout'
  | 'quota-exceeded'
  | 'provider-error'
  | (string & {});

/** Machine-readable failure carried by a result envelope. */
export interface LlmFailure {
  /** Stable failure category. */
  code: LlmErrorCode;
  /** Safe human-readable diagnostic; never a raw provider body or credential-store error. */
  message: string;
}

/** Constraints a connection must meet before the user is offered it. */
export interface LlmRequirements {
  /** Exact provider model identifier; omission allows user choice. */
  model?: string;
  /** `true` requires image input support. */
  images?: boolean;
  /** `true` requires JSON-object output support. */
  json?: boolean;
}

/** A user-selected connection, described without credentials. */
export interface LlmModel {
  /** Opaque reference scoped to this endpoint and user account; not a URL or credential. */
  handle: string;
  /** User-facing connection label. */
  name: string;
  /** Selected model identifier. */
  model: string;
  /** Human-readable disclosure route, including intermediaries and destination. */
  route: string;
  /** Whether the connection supports image input. */
  images: boolean;
  /** Whether the connection supports JSON-object output. */
  json: boolean;
}

/** A text content part. */
export interface LlmTextPart {
  type: 'text';
  text: string;
}

/** An inline image content part. */
export interface LlmImagePart {
  type: 'image';
  mimeType: LlmImageMimeType;
  /** Standard padded base64 bytes without whitespace, data-URI prefix, or remote URL. */
  data: string;
}

/** One ordered content part. */
export type LlmPart = LlmTextPart | LlmImagePart;

/** One conversation message. */
export interface LlmMessage {
  role: LlmRole;
  /** Ordered, nonempty content parts. */
  content: LlmPart[];
}

/** One stateless generation: the supplied messages are the entire conversation. */
export interface LlmGenerationRequest {
  /** A live Model handle. */
  handle: string;
  /** Ordered, nonempty conversation. */
  messages: LlmMessage[];
  /** Defaults to `text`. */
  format?: LlmFormat;
}

/** Provider-reported token counts. Not a price or settlement receipt. */
export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

/** Terminal generation result. The complete `text` replaces any provisional deltas. */
export interface LlmGeneration {
  /** Complete accumulated output, including any streamed portion. */
  text: string;
  finish: LlmFinish;
  usage?: LlmUsage;
}

/** Provisional streamed output for one generation. */
export interface LlmDelta {
  /** The originating generation's request id. */
  requestId: string;
  /** Contiguous sequence starting at zero for this generation. */
  sequence: number;
  /** Text to append to the provisional display. */
  text: string;
}

/** Local binding options for one generation. */
export interface LlmGenerateOptions {
  /** Aborting sends `llm.cancel` for this generation; the generation settles through its own result. */
  signal?: AbortSignal;
  /** Receives ordered provisional deltas when the runtime streams. */
  onDelta?: (delta: LlmDelta) => void;
}

/** A pending generation that exposes the request id usable with `cancel`. */
export type LlmPendingGeneration = Promise<LlmGeneration> & { readonly requestId: string };

/**
 * Injected `window.napplet.llm` API. Presence signals domain availability, not a
 * configured connection or a consent grant. Each method rejects with the
 * specification failure when the runtime answers with an error.
 */
export interface LlmApi {
  /** Ask the user to choose a connection that meets the requirements. */
  select(requirements?: LlmRequirements): Promise<LlmModel>;
  /** Revalidate a selection without generating or showing another chooser. */
  describe(handle: string): Promise<LlmModel>;
  /** Submit one stateless generation; the runtime obtains disclosure consent first. */
  generate(request: LlmGenerationRequest, options?: LlmGenerateOptions): LlmPendingGeneration;
  /** Cancel an active generation owned by this endpoint; `false` for unknown or terminal ids. */
  cancel(requestId: string): Promise<boolean>;
}
