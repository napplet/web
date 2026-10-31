/** NAP-LLM package entrypoint. Canonical proposal: https://github.com/napplet/naps/pull/134. */
import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';
export { DOMAIN, LLM_ERROR_CODES } from './types.js';
export type * from './types.js';
export { LlmError, select, describe, generate, cancel, installLlmShim, handleLlmMessage } from './shim.js';
export { isLlmFailure, llmSelect, llmDescribe, llmGenerate, llmCancel } from './sdk.js';

registerNap(DOMAIN, () => { /* The runtime supplies the domain handler. */ });
