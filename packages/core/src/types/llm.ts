/** User-selected, runtime-mediated inference from the living NAP-LLM proposal: https://github.com/napplet/naps/pull/134. */

/** Conversation role of one message. */
export type LlmRole = 'system' | 'user' | 'assistant' | 'toolResult';

/** Requested output format. `json` requires a JSON object, not an array or scalar. */
export type LlmFormat = 'text' | 'json';

/** Declared encoding of an inline image part. */
export type LlmImageMimeType = 'image/png' | 'image/jpeg' | 'image/webp';

/** Why a generation ended. Only `stop` is normal completion. */
export type LlmFinish = 'stop' | 'length' | 'refusal' | 'toolUse';

/**
 * Tool-choice modes a connection can support. `tool` means forcing one named tool.
 * A connection with `tools: true` supports at least `auto` and `none`.
 */
export type LlmToolChoiceMode = 'auto' | 'none' | 'required' | 'tool';

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
  /** `true` requires tool-calling support. */
  tools?: boolean;
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
  /** Whether the connection supports tool calling. */
  tools: boolean;
  /** Exactly the supported tool-choice modes, without duplicates; empty when `tools` is false. */
  toolChoiceModes: LlmToolChoiceMode[];
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

/**
 * Display-only model reasoning. Permitted only in assistant messages; the runtime
 * omits it from provider input when assistant history is replayed.
 */
export interface LlmThinkingPart {
  type: 'thinking';
  text: string;
}

/**
 * A model request to call one tool. Permitted only in assistant messages. A call
 * is a request, not authorization: the napplet validates it and executes it, if
 * at all, through separately authorized capabilities.
 */
export interface LlmToolCallPart {
  type: 'toolCall';
  /** Stable id matching the later `toolResult` message. */
  toolCallId: string;
  /** Tool name. */
  name: string;
  /** Tool arguments as a JSON object. */
  arguments: Record<string, unknown>;
}

/** One ordered content part. */
export type LlmPart = LlmTextPart | LlmImagePart | LlmThinkingPart | LlmToolCallPart;

/** Parts a terminal Generation may carry: text, thinking, and tool calls. */
export type LlmOutputPart = LlmTextPart | LlmThinkingPart | LlmToolCallPart;

/** One conversation message. */
export interface LlmMessage {
  role: LlmRole;
  /**
   * Ordered, nonempty content parts. `thinking` and `toolCall` parts belong only
   * to assistant messages; `toolResult` content permits only text and image parts.
   */
  content: LlmPart[];
  /** For `toolResult` only: the `toolCallId` of the call this message answers. */
  toolCallId?: string;
  /** For `toolResult` only: the name of the tool that produced the result. */
  toolName?: string;
  /** For `toolResult` only: whether the tool failed. Defaults to `false`. */
  isError?: boolean;
}

/** One tool the model may call. */
export interface LlmTool {
  /** Portable tool name matching `^[A-Za-z0-9_-]{1,64}$`, unique within the request. */
  name: string;
  /** What the tool does. */
  description?: string;
  /**
   * JSON Schema (draft 2020-12) with root `type: "object"`. Omission means an
   * object schema with no properties and no additional properties.
   */
  parameters?: Record<string, unknown>;
}

/** Forces the model to call one named tool from the request's `tools`. */
export interface LlmNamedToolChoice {
  type: 'tool';
  /** Tool name to force. */
  name: string;
}

/** How the model selects tools. Defaults to `auto` when tools are present. */
export type LlmToolChoice = 'auto' | 'none' | 'required' | LlmNamedToolChoice;

/** One stateless generation: the supplied messages are the entire conversation. */
export interface LlmGenerationRequest {
  /** A live Model handle. */
  handle: string;
  /** Ordered, nonempty conversation. */
  messages: LlmMessage[];
  /** Defaults to `text`. */
  format?: LlmFormat;
  /** Positive integer output token limit; runtime policy may cap it. */
  maxTokens?: number;
  /** Sampling temperature; values the connection does not support produce `unsupported`. */
  temperature?: number;
  /** Tools the model may call. An empty list is equivalent to omission. */
  tools?: LlmTool[];
  /** How the model selects tools; requires a non-empty `tools` list when present. */
  toolChoice?: LlmToolChoice;
}

/** Provider-reported token counts. Not a price or settlement receipt. */
export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  /** Tokens read from a provider cache. */
  cacheReadTokens?: number;
  /** Tokens written to a provider cache. */
  cacheWriteTokens?: number;
  /** Tokens attributed to reasoning. */
  reasoningTokens?: number;
}

/**
 * Terminal generation result. Its `content` replaces any provisional deltas.
 * Only `finish: "stop"` is normal completed output; `toolUse` carries at least
 * one tool call, and `length` / `refusal` results carry no tool calls.
 */
export interface LlmGeneration {
  /** Complete accumulated output; may be empty for `length` or `refusal`. */
  content: LlmOutputPart[];
  finish: LlmFinish;
  usage?: LlmUsage;
}

/** Kind of streamed content block. */
export type LlmDeltaBlock = 'text' | 'thinking' | 'toolCall';

/** Block lifecycle event: one `start`, zero or more `delta`, then one `end`. */
export type LlmDeltaEvent = 'start' | 'delta' | 'end';

/**
 * Provisional streamed output for one generation. Never execute a tool from a
 * delta; only an authoritative `toolUse` result carries executable calls.
 */
export interface LlmDelta {
  /** The originating generation's request id. */
  requestId: string;
  /** Contiguous sequence starting at zero for this generation. */
  sequence: number;
  /** Block lifecycle event. */
  event: LlmDeltaEvent;
  /** Kind of content block. */
  block: LlmDeltaBlock;
  /** Zero-based index of the block within the generation's content. */
  blockIndex: number;
  /** For `delta` only: a text fragment, or a JSON argument fragment for `toolCall`. */
  text?: string;
  /** For a `toolCall` `start` only: id used by the terminal call. */
  toolCallId?: string;
  /** For a `toolCall` `start` only: tool name used by the terminal call. */
  name?: string;
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
