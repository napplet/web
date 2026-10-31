# LLM

## User-selected language models through the runtime

This non-normative guide follows the living [NAP-LLM proposal](https://github.com/napplet/naps/pull/134). When the runtime exposes `window.napplet.llm`, a napplet can ask the user to pick a model connection and submit stateless generations against it. The napplet owns its prompts, conversation, and output validation; the runtime owns connection selection, credentials, disclosure consent, and provider access. Domain presence does not imply a configured connection or a consent grant: handle `unsupported` and `user-cancelled` as ordinary outcomes and keep the rest of the napplet usable without inference.

Import `llm` from `@napplet/sdk` or `@napplet/sdk/llm`; root exports include prefixed helpers such as `llmSelect` and `llmGenerate`. The dedicated subpath also provides bare aliases such as `select` and `generate`.

```ts
import { llm, isLlmFailure } from '@napplet/sdk/llm';

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
  if (generation.finish === 'stop') applyLabel(JSON.parse(generation.text));
}
```

## Operations and results

| Method | Result |
| --- | --- |
| `select(requirements?)` | `LlmModel` |
| `describe(handle)` | `LlmModel` |
| `generate(request, options?)` | `LlmGeneration`, with `requestId` on the pending promise |
| `cancel(requestId)` | `boolean` |

`select` asks the user to choose a connection meeting the optional `model`, `images`, and `json` requirements; a user default that meets them may satisfy it without a chooser. The returned `handle` is opaque, scoped to this endpoint and account, and never a URL or credential. `describe` revalidates a handle without a chooser; a changed connection, model, credential, account, or endpoint lifetime invalidates handles and rejects with `selection-expired`, so select again. `route` is a human-readable disclosure path including intermediaries; "local model" does not promise data stays on the device when the runtime is hosted.

`generate` is one stateless request: the supplied messages are the entire conversation, and the runtime does not append or drop anything. Only `finish: "stop"` is normal completion; `length` and `refusal` may carry partial or empty text and must not be presented as complete. With `format: "json"`, a `stop` result parses as a JSON object, but its schema, accuracy, and suitability remain the napplet's checks. `usage` is provider-reported token counts, not a price.

## Streaming and cancellation

The pending promise returned by `generate` exposes `requestId`. Pass `onDelta` to receive ordered provisional text and `signal` to map an abort to `llm.cancel`; the generation still settles through its own result, because completion may win the race. Deltas are optional, so render provisional text as provisional and replace it with the terminal `text` rather than appending. The binding stops provisional delivery after a sequence gap and still resolves the terminal result.

```ts
const controller = new AbortController();
const pending = llm.generate(request, {
  signal: controller.signal,
  onDelta: (delta) => showProvisional(delta.text),
});
cancelButton.onclick = () => controller.abort();
try {
  showFinal((await pending).text);
} catch (error) {
  if (isLlmFailure(error) && error.code === 'cancelled') showCancelled();
  else throw error;
}
```

`cancel(requestId)` resolves `true` only when an active generation owned by this endpoint was terminated; unknown, terminal, or foreign ids resolve `false`. The runtime bounds generation time, including the consent wait, and reports `timeout`. Neither cancellation nor timeout proves the provider stopped computing or charging, so never retry an ambiguous outcome automatically; a user-initiated retry is a new request and a new consent.

## Failures

A runtime `Error` record rejects the promise with an `Error` whose `code` is the specification category (`unsupported`, `invalid-request`, `selection-expired`, `user-cancelled`, `cancelled`, `timeout`, `quota-exceeded`, `provider-error`) and whose `message` is a diagnostic for people, not for matching. Unknown codes are still failures. Use `isLlmFailure(error)` to recognize one across bundle boundaries. A lost response is different from an explicit error: the binding's own transport timeout rejects with a plain `Error` and no `code`. Runtime limits are policy, not fixed maxima; a request that exceeds them fails explicitly instead of truncating messages, dropping images, or changing models.

## Declaring the domain

Declare `llm` as required (`R`) only when inference is the napplet's core task; otherwise declare it optional (`O`) and check `window.napplet?.llm` before use. The vite plugin infers the bare domain from `@napplet/sdk/llm` and `@napplet/nap/llm` imports and from direct `window.napplet.llm` reads. Declaring the domain configures no connection and grants no consent. Model output is untrusted text: render it as text, never as markup, and never treat it as authorization to execute tools, sign, pay, or fetch.

## Conformance scope

Conformance validates the four request schemas, rejects result and delta envelopes emitted by napplets, and runs the reference shell's deterministic mock: one connection (`reference-model`, images and JSON supported), endpoint-scoped handles, exact-model requirement matching, one streamed delta before the authoritative result, echoed text or JSON output, and fixture markers in the last user text (`[[decline]]` for a declined prompt, `[[refuse]]` for a provider refusal, `[[stall]]` for a generation that stays active until `cancel`). It exercises protocol shape, not live inference, consent prompts, provider adapters, or billing; verify those in an LLM-capable host.
