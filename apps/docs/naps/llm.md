# LLM

## User-selected language models through the runtime

This non-normative guide follows the living [NAP-LLM proposal](https://github.com/napplet/naps/pull/134). When the runtime exposes `window.napplet.llm`, a napplet can ask the user to pick a model connection and submit stateless generations against it. The napplet owns its prompts, conversation, and output validation; the runtime owns connection selection, credentials, disclosure consent, and provider access. Domain presence does not imply a configured connection or a consent grant: handle `unsupported` and `user-cancelled` as ordinary outcomes and keep the rest of the napplet usable without inference.

Import `llm` from `@napplet/sdk` or `@napplet/sdk/llm`; root exports include prefixed helpers such as `llmSelect` and `llmGenerate`. The dedicated subpath also provides bare aliases such as `select` and `generate`.

```ts
import { llm, isLlmFailure, llmText } from '@napplet/sdk/llm';

if (window.napplet?.llm) {
  const model = await llm.select({ json: true });
  const generation = await llm.generate({
    handle: model.handle,
    messages: [
      { role: 'system', content: [{ type: 'text', text: 'Return a JSON object with a short label.' }] },
      { role: 'user', content: [{ type: 'text', text: note }] },
    ],
    format: 'json',
  });
  if (generation.finish === 'stop') applyLabel(JSON.parse(llmText(generation)));
}
```

## Operations and results

| Method | Result |
| --- | --- |
| `select(requirements?)` | `LlmModel` |
| `describe(handle)` | `LlmModel` |
| `generate(request, options?)` | `LlmGeneration`, with `requestId` on the pending promise |
| `cancel(requestId)` | `boolean` |

`select` asks the user to choose a connection meeting the optional `model`, `images`, `json`, and `tools` requirements; a user default that meets them may satisfy it without a chooser. The returned `handle` is opaque, scoped to this endpoint and account, and never a URL or credential. `describe` revalidates a handle without a chooser; a changed connection, model, credential, account, or endpoint lifetime invalidates handles and rejects with `selection-expired`, so select again. `route` is a human-readable disclosure path including intermediaries; "local model" does not promise data stays on the device when the runtime is hosted. `tools` and `toolChoiceModes` say whether the connection calls tools and which of `auto`, `none`, `required`, and `tool` (named forcing) it supports; a request for an unlisted mode fails with `unsupported` instead of being substituted.

`generate` is one stateless request: the supplied messages are the entire conversation, and the runtime does not append or drop anything. Optional `maxTokens` (a positive integer the runtime may cap) and `temperature` (unsupported values fail with `unsupported`) tune the request. The terminal `content` is a list of `text`, `thinking`, and `toolCall` parts; `llmText(generation)` concatenates the text parts. Only `finish: "stop"` is normal completion; `length` and `refusal` may carry partial or empty content, carry no tool calls, and must not be presented as complete. With `format: "json"`, the text of a `stop` result parses as a JSON object, but its schema, accuracy, and suitability remain the napplet's checks. `thinking` parts are display-only: the runtime omits them when history is replayed. `usage` is provider-reported token counts (including optional cache and reasoning counts), not a price.

## Tool calls

Pass `tools` (portable names matching `^[A-Za-z0-9_-]{1,64}$`, an optional description, and a JSON Schema whose root is `type: "object"`) and an optional `toolChoice`. The model may answer with `finish: "toolUse"` and one or more `toolCall` parts. The runtime never executes them: a call is a request, not authorization, so validate its arguments and obtain any separately required capability before running it. Then send the whole conversation again, with the assistant turn as returned and one `toolResult` message per call immediately after it, reusing the call's `toolCallId` and name. Set `isError: true` when the tool failed. Tool results re-enter the model as untrusted input.

```ts
import { llm, llmText, llmToolCalls } from '@napplet/sdk/llm';
import type { LlmMessage, LlmTool } from '@napplet/sdk/llm';

const tools: LlmTool[] = [{
  name: 'get_weather',
  description: 'Look up current weather',
  parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
}];
const messages: LlmMessage[] = [{ role: 'user', content: [{ type: 'text', text: 'What is the weather in Berlin?' }] }];

let generation = await llm.generate({ handle: model.handle, messages, tools });
while (generation.finish === 'toolUse') {
  messages.push({ role: 'assistant', content: generation.content });
  for (const call of llmToolCalls(generation)) {
    const outcome = await runToolIfAllowed(call); // the napplet's own validation and authority
    messages.push({ role: 'toolResult', toolCallId: call.toolCallId, toolName: call.name, isError: !outcome.ok, content: [{ type: 'text', text: outcome.text }] });
  }
  generation = await llm.generate({ handle: model.handle, messages, tools });
}
if (generation.finish === 'stop') show(llmText(generation));
```

Each consent prompt discloses tool definitions and results as well as prompts, so every round trip is a new disclosure and may be a new charge. History with completed calls and results may be replayed without `tools`, which continues the exchange without enabling new calls.

## Streaming and cancellation

The pending promise returned by `generate` exposes `requestId`. Pass `onDelta` to receive ordered provisional block events and `signal` to map an abort to `llm.cancel`; the generation still settles through its own result, because completion may win the race. Each block (`text`, `thinking`, or `toolCall`, identified by `blockIndex`) streams one `start`, zero or more `delta` events carrying `text` fragments (JSON argument fragments for a tool call), and one `end`; a `toolCall` start carries the call's `toolCallId` and `name`. Deltas are optional, so render provisional output as provisional and replace it with the terminal `content` rather than appending. Never execute a tool from a delta or a block `end`. The binding drops deltas that do not match the schema, stops provisional delivery after a sequence gap, and still resolves the terminal result.

```ts
const controller = new AbortController();
const pending = llm.generate(request, {
  signal: controller.signal,
  onDelta: (delta) => {
    if (delta.event === 'delta' && delta.block === 'text') showProvisional(delta.blockIndex, delta.text);
  },
});
cancelButton.onclick = () => controller.abort();
try {
  showFinal(llmText(await pending));
} catch (error) {
  if (isLlmFailure(error) && error.code === 'cancelled') showCancelled();
  else throw error;
}
```

`cancel(requestId)` resolves `true` only when an active generation owned by this endpoint was terminated; unknown, terminal, or foreign ids resolve `false`. The runtime bounds generation time, including the consent wait, and reports `timeout`. Neither cancellation nor timeout proves the provider stopped computing or charging, so never retry an ambiguous outcome automatically; a user-initiated retry is a new request and a new consent.

## Failures

A runtime `Error` record rejects the promise with an `Error` whose `code` is the specification category (`unsupported`, `invalid-request`, `selection-expired`, `user-cancelled`, `cancelled`, `timeout`, `quota-exceeded`, `provider-error`) and whose `message` is a diagnostic for people, not for matching. Unknown codes are still failures. Use `isLlmFailure(error)` to recognize one across bundle boundaries. A lost response is different from an explicit error: the binding's own transport timeout rejects with a plain `Error` and no `code`. Runtime limits are policy, not fixed maxima; a request that exceeds them fails explicitly instead of truncating messages, dropping images, or changing models.

## Declaring the domain

Declare `llm` as required (`R`) only when inference is the napplet's core task; otherwise declare it optional (`O`) and check `window.napplet?.llm` before use. The vite plugin infers the bare domain from `@napplet/sdk/llm` and `@napplet/nap/llm` imports and from direct `window.napplet.llm` reads. Declaring the domain configures no connection and grants no consent. Model output is untrusted data: render it as text, never as markup, and never treat it as authorization to execute tools, sign, pay, or fetch.

## Conformance scope

Conformance validates the four request schemas, including tool definitions, tool-choice rules, part placement by role, and adjacent tool-result matching, rejects result and delta envelopes emitted by napplets, and runs the reference shell's deterministic mock: one connection (`reference-model`, with images, JSON, tools, and every tool-choice mode), endpoint-scoped handles, exact-model requirement matching, a `start` / `delta` / `end` block lifecycle before the authoritative result, echoed text or JSON output (trailing tool results echoed, with the specified `Tool execution failed.` prefix for errors), a `toolUse` result for `required` or named choices, and fixture markers in the last user text (`[[decline]]` for a declined prompt, `[[refuse]]` for a provider refusal, `[[stall]]` for a generation that stays active until `cancel`, `[[think]]` for a thinking block, `[[tool]]` for a call to the first supplied tool). The mock never executes a tool call. It exercises protocol shape, not live inference, consent prompts, provider adapters, or billing; verify those in an LLM-capable host.
