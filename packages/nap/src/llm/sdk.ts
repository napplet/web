/** SDK helpers for the runtime-injected NAP-LLM domain. @module */
import type {
  LlmApi,
  LlmFailure,
  LlmGenerateOptions,
  LlmGeneration,
  LlmGenerationRequest,
  LlmModel,
  LlmPendingGeneration,
  LlmRequirements,
  LlmToolCallPart,
  NappletGlobal,
} from '@napplet/core';

function requireLlm(): LlmApi {
  const runtime = (window as Window & { napplet?: NappletGlobal }).napplet;
  if (!runtime?.llm) throw new Error('window.napplet.llm is unavailable -- runtime did not inject this domain');
  return runtime.llm;
}

/** Recognize a rejection that carries a NAP-LLM `Error` record, across bundle boundaries.
 * @param error Any caught value.
 * @returns `true` when `error` has a nonempty text `code` and a text `message`; unknown codes are still failures.
 * @example try { await llmGenerate(request); } catch (error) { if (isLlmFailure(error) && error.code === 'user-cancelled') return; throw error; }
 */
export function isLlmFailure(error: unknown): error is Error & LlmFailure {
  if (!error || typeof error !== 'object') return false;
  const record = error as Record<string, unknown>;
  return typeof record.code === 'string' && record.code.length > 0 && typeof record.message === 'string';
}

/** Delegate llm.select to the current runtime.
 * @param requirements Optional capability constraints.
 * @returns The selected Model.
 * @example await llmSelect({ json: true });
 */
export function llmSelect(requirements?: LlmRequirements): Promise<LlmModel> {
  return requireLlm().select(requirements);
}

/** Delegate llm.describe to the current runtime.
 * @param handle A Model handle issued to this endpoint.
 * @returns The revalidated Model.
 * @example await llmDescribe(model.handle);
 */
export function llmDescribe(handle: string): Promise<LlmModel> {
  return requireLlm().describe(handle);
}

/** Delegate llm.generate to the current runtime.
 * @param request The complete conversation, handle, and optional format, limits, and tools.
 * @param options Optional abort signal and delta listener.
 * @returns The pending Generation, exposing `requestId`.
 * @example const generation = await llmGenerate({ handle, messages, format: 'json' });
 */
export function llmGenerate(request: LlmGenerationRequest, options?: LlmGenerateOptions): LlmPendingGeneration {
  return requireLlm().generate(request, options);
}

/** Delegate llm.cancel to the current runtime.
 * @param requestId The generation's request id.
 * @returns Whether an active generation was terminated.
 * @example await llmCancel(pending.requestId);
 */
export function llmCancel(requestId: string): Promise<boolean> {
  return requireLlm().cancel(requestId);
}

/** Concatenate a generation's text parts in order, skipping thinking and tool calls.
 * For `format: "json"`, NAP-LLM requires this concatenation of a `stop` result to parse as a JSON object.
 * @param generation A terminal Generation.
 * @returns The text output; empty when the generation carries no text parts.
 * @example const data = JSON.parse(llmText(await llmGenerate({ handle, messages, format: 'json' })));
 */
export function llmText(generation: LlmGeneration): string {
  return generation.content.map((part) => (part.type === 'text' ? part.text : '')).join('');
}

/** The tool calls a napplet may consider executing: those of an authoritative `toolUse` result only.
 * Calls are requests, not authorization; validate them and obtain any separately required authority first.
 * @param generation A terminal Generation (never a delta).
 * @returns The `toolCall` parts when `finish` is `toolUse`; otherwise an empty list.
 * @example for (const call of llmToolCalls(generation)) results.push(await runTool(call));
 */
export function llmToolCalls(generation: LlmGeneration): LlmToolCallPart[] {
  if (generation.finish !== 'toolUse') return [];
  return generation.content.filter((part): part is LlmToolCallPart => part.type === 'toolCall');
}
