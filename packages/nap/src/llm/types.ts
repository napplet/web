/** NAP-LLM wire envelopes. Canonical proposal: https://github.com/napplet/naps/pull/134 */
import type {
  LlmDelta,
  LlmFailure,
  LlmGeneration,
  LlmGenerationRequest,
  LlmModel,
  LlmRequirements,
  NappletMessage,
} from '@napplet/core';

export type {
  LlmApi,
  LlmDelta,
  LlmErrorCode,
  LlmFailure,
  LlmFinish,
  LlmFormat,
  LlmGenerateOptions,
  LlmGeneration,
  LlmGenerationRequest,
  LlmImageMimeType,
  LlmImagePart,
  LlmMessage,
  LlmModel,
  LlmPart,
  LlmPendingGeneration,
  LlmRequirements,
  LlmRole,
  LlmTextPart,
  LlmUsage,
} from '@napplet/core';

/** LLM domain discriminator. */
export const DOMAIN = 'llm' as const;

/** The NAP-LLM error codes named by the specification, in specification order. Unknown codes are still failures. */
export const LLM_ERROR_CODES = [
  'unsupported',
  'invalid-request',
  'selection-expired',
  'user-cancelled',
  'cancelled',
  'timeout',
  'quota-exceeded',
  'provider-error',
] as const;

/** A result envelope carries the same id and exactly one of its success field or `error`. */
type Reply<Key extends string, Value> = NappletMessage & { id: string }
  & ({ [K in Key]: Value } & { error?: never } | { error: LlmFailure } & { [K in Key]?: never });

/** Request for llm.select. `requirements` is omitted, never `null`. */
export interface LlmSelectMessage extends NappletMessage {
  type: 'llm.select';
  id: string;
  requirements?: LlmRequirements;
}
/** Response to llm.select. */
export type LlmSelectResultMessage = {
  type: 'llm.select.result';
} & Reply<'model', LlmModel>;

/** Request for llm.describe. */
export interface LlmDescribeMessage extends NappletMessage {
  type: 'llm.describe';
  id: string;
  handle: string;
}
/** Response to llm.describe. */
export type LlmDescribeResultMessage = {
  type: 'llm.describe.result';
} & Reply<'model', LlmModel>;

/** Request for llm.generate. */
export interface LlmGenerateMessage extends NappletMessage {
  type: 'llm.generate';
  id: string;
  request: LlmGenerationRequest;
}
/** Terminal response to llm.generate. */
export type LlmGenerateResultMessage = {
  type: 'llm.generate.result';
} & Reply<'result', LlmGeneration>;

/** Unsolicited provisional output routed to the requesting endpoint; carries `requestId`, not `id`. */
export interface LlmDeltaMessage extends NappletMessage, LlmDelta {
  type: 'llm.delta';
}

/** Request for llm.cancel. */
export interface LlmCancelMessage extends NappletMessage {
  type: 'llm.cancel';
  id: string;
  requestId: string;
}
/** Response to llm.cancel. */
export type LlmCancelResultMessage = {
  type: 'llm.cancel.result';
} & Reply<'cancelled', boolean>;

/** Napplet-to-runtime llm envelopes. */
export type LlmOutboundMessage =
  | LlmSelectMessage
  | LlmDescribeMessage
  | LlmGenerateMessage
  | LlmCancelMessage;

/** Runtime-to-napplet llm envelopes. */
export type LlmInboundMessage =
  | LlmSelectResultMessage
  | LlmDescribeResultMessage
  | LlmDeltaMessage
  | LlmGenerateResultMessage
  | LlmCancelResultMessage;

/** All llm wire envelopes. */
export type LlmNapMessage = LlmOutboundMessage | LlmInboundMessage;
