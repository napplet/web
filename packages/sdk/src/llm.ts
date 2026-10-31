/** User-selected, runtime-mediated language model inference. The runtime owns connections, credentials, and consent. @module */
import type { LlmApi } from '@napplet/core';
import { requireDomain } from './require-napplet.js';

/**
 * Delegate llm operations to the current injected runtime.
 * @example const model = await llm.select({ json: true });
 */
export const llm: LlmApi = {
  /** Delegate `select`. @param args Operation arguments. @returns Runtime result. */
  select(...args: Parameters<LlmApi['select']>): ReturnType<LlmApi['select']> {
    return requireDomain('llm').select(...args);
  },
  /** Delegate `describe`. @param args Operation arguments. @returns Runtime result. */
  describe(...args: Parameters<LlmApi['describe']>): ReturnType<LlmApi['describe']> {
    return requireDomain('llm').describe(...args);
  },
  /** Delegate `generate`. @param args Operation arguments. @returns Pending generation exposing `requestId`. */
  generate(...args: Parameters<LlmApi['generate']>): ReturnType<LlmApi['generate']> {
    return requireDomain('llm').generate(...args);
  },
  /** Delegate `cancel`. @param args Operation arguments. @returns Runtime result. */
  cancel(...args: Parameters<LlmApi['cancel']>): ReturnType<LlmApi['cancel']> {
    return requireDomain('llm').cancel(...args);
  },
};

export type * from '@napplet/nap/llm/types';
export { LLM_ERROR_CODES } from '@napplet/nap/llm/types';
export {
  isLlmFailure,
  llmSelect,
  llmSelect as select,
  llmDescribe,
  llmDescribe as describe,
  llmGenerate,
  llmGenerate as generate,
  llmCancel,
  llmCancel as cancel,
} from '@napplet/nap/llm/sdk';
