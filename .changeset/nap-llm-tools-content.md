---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/sdk": minor
"@napplet/shim": minor
"@napplet/conformance": minor
"@napplet/conformance-cli": minor
---

Follow the living NAP-LLM draft (napplet/naps#134 with the merged tool-use revision #138). Breaking: `LlmGeneration.text` is replaced by `content` parts (`text`, `thinking`, `toolCall`), and `llm.delta` now carries `start` / `delta` / `end` block events with `block` and `blockIndex`. Added: tool definitions and `toolChoice`, `toolCall` and `thinking` parts, the `toolResult` role with `isError`, `maxTokens` and `temperature`, `finish: "toolUse"`, cache and reasoning usage counts, and `tools` / `toolChoiceModes` on requirements and models. The SDK adds `llmText` and `llmToolCalls`. Conformance validates tool requests and result adjacency, and the reference shell streams block lifecycles and returns tool calls on request without executing them.
