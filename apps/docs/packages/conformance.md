# @napplet/conformance

> Framework-agnostic conformance engine for the napplet protocol — lets a napplet
> self-verify that it conforms to NIP-5D + the NAP wire protocol **before**
> publishing.

`@napplet/conformance` is a **development/testing tool**. It is not loaded inside
the napplet sandbox at runtime. One engine drives two scopes:

- **Headless / CI** — via the [`@napplet/conformance-cli`](./conformance-cli)
  `napplet-conformance` Playwright runner.
- **Standalone web runtime** — the single-window `apps/conformance` app.

v1 is **zero-config protocol conformance**: NIP-5D manifest-event validity, boots
under `sandbox="allow-scripts"`, receives a runtime-injected `window.napplet`,
every emitted postMessage envelope validates against the per-NAP validators,
graceful degradation when a domain is absent, and no forbidden globals.

The harness acts as a NIP-5D shell for the [port-bound identity](https://github.com/nostr-protocol/nips/pull/2303) model: it binds the `MessagePort` from the first valid `napplet.hello`, answers only over that port, and revokes the napplet and removes its frame on a second hello, any other window-level message, a second `load` or the port closing. `wire/port-only` fails a napplet that posts messages at window level instead of through `window.napplet`; `lifecycle/keeps-verified-document` is an advisory for a napplet that navigates or reloads its own frame. `attachReferenceShell(shell, { host, expectedSource })` and `bindNappletPort` give custom harnesses the same binding.

- **npm:** [`@napplet/conformance`](https://www.npmjs.com/package/@napplet/conformance)
- **JSR:** [`@napplet/conformance`](https://jsr.io/@napplet/conformance)
- **Source:** [packages/conformance](https://github.com/napplet/web/tree/main/packages/conformance)

## Local maturity policy

The reference mock can enforce a resolved host domain ceiling: `createReferenceShell({ domains: selection.domains })`, where `selection` comes from `selectNapDomains` in `@napplet/core`. The same set belongs in the injected prelude. Per-endpoint grants can narrow this ceiling but cannot widen it; excluded requests remain recorded for envelope validation and receive no response.

`bootAndCollect({ ...options, domains: ['storage', 'llm'], maturity: {} })` selects supported candidates before boot and uses that set in both injection and dispatch. A named opt-in such as `maturity: { optIn: ['llm'] }` enables evaluation of that candidate. Normal conformance runs omit maturity filtering and retain full-domain coverage. Experimental status never waives protocol validation. See the [maturity guide](https://napplet.run/docs/naps/maturity.html).

## Install

```bash
npm install -D @napplet/conformance
```

## What's in the box

- **`validateEnvelope(msg)`** — runtime validation of any `domain.action` envelope
  a napplet emits, across every NAP domain. Catches malformed payloads, unknown
  types, and napplets that put shell→napplet (inbound) traffic on the wire.
- **`validateManifestEvent(event)`** — checks that a resolved Nostr event is a NIP-5D napplet manifest (`5129`, `15129`, or `35129`) with a single `/index.html` artifact `x` hash, non-empty description, and bare `R`/`O` domains. Domains outside the toolchain registry produce an advisory `manifest/requires-known` warning without failing the run or implying runtime support.
- **`validateManifest(html)`** — compatibility wrapper for older HTML-only
  harnesses. HTML alone cannot prove a signed NIP-5D manifest event.
- **`parsePresentationMedia(event)`** — applies NIP-5D §Presentation media to `screenshot` and `preview` tags: splits NIP-92 `key value` fields, requires one `x` sha256, drops entries clients must ignore, and returns the usable list in manifest order with advisories for everything ignored.
- **Reference mock shell**, **check registry**, and **reporters** that the CLI and
  the web runtime share.

The validator surface is kept in lockstep with `@napplet/nap` by a drift test, so
a new NAP message type cannot ship without matching conformance coverage.

Manifest validation accepts extra Nostr tags and leaves their payloads and multiplicity unchanged. It checks required fields and recognized optional metadata rather than enforcing a tag-name allowlist. A `source` tag is checked for its single-location shape and supported HTTP(S), SSH, Git, scp-like, or NIP-34 `nostr://` format; `source-commit` and `source-archive` are checked for their single-tag shape. Invalid icons, screenshots and previews, and a `source-commit` without a repository `source`, remain advisory (`manifest/media-usable`) with fallback. Extra tags cannot make missing content, invalid hashes, or malformed capability declarations pass. This is non-normative implementation guidance; consult the living [NIP-5D proposal](https://github.com/nostr-protocol/nips/pull/2303) for the requirements.

```ts
import { validateEnvelope, validateManifestEvent } from '@napplet/conformance';

validateEnvelope({
  type: 'outbox.query',
  id: 'a',
  filters: [{ kinds: [1] }],
}).ok; // true

validateManifestEvent(resolvedManifestEvent).ok; // true when the manifest event is well-formed
```

::: tip
NIP-5D loads a napplet as a single self-contained `/index.html` via
`iframe.srcdoc` (opaque origin), so a napplet's JS is **inline by design**.
Conformance does not penalize inline `<script>` elements.
:::

## See also

- [`@napplet/conformance-cli`](./conformance-cli) — the headless runner that drives this engine
- [NIP-5D explained](/guide/nip-5d) — manifest & NAP negotiation
- [Core concepts](/guide/concepts) — the envelope wire format these validators check

## Custom browser hosts

`bootAndCollect({ url, html, runtimePreludeSource })` requires the maintained shim IIFE source and accepts an optional loaded HTML snapshot. The CLI reads `@napplet/shim/prelude.global`; Vite hosts can import it with `?raw`. The harness appends the explicit domain allowlist call, so the napplet sees exactly the bindings the maintained runtime installs; it ships no bindings of its own. Supplying `html` avoids refetching an artifact after the host verifies its signature and raw bytes. The engine remains browser-safe and does not import Node APIs or bundled asset loaders. `installedGlobal` records observed installation independently from `bootError`; an app failure does not imply injection failed. Signature/hash verification belongs to the loading host, while `validateManifestEvent` checks the event structure. This is non-normative implementation guidance; consult the living [NIP-5D proposal](https://github.com/nostr-protocol/nips/pull/2303) and [NAPs](https://github.com/napplet/naps).

## LLM conformance scope

NAP-LLM validation checks the four request schemas (exact API-row parameters, strict input records without unknown fields or `null`, enum roles and formats, padded base64 image data, nonempty ids, positive integer `maxTokens`, portable unique tool names with object-rooted schemas, an explicit `toolChoice` only with tools and a listed forced name, `thinking` and `toolCall` parts only in assistant messages, and each tool call answered exactly once by an adjacent, name-matching `toolResult`) and rejects result and delta envelopes emitted by napplets, following the living [NAP-LLM proposal](https://github.com/napplet/naps/pull/134). The reference shell is a deterministic mock: one connection that supports images, JSON, tools, and every tool-choice mode, endpoint-scoped handles, exact-model requirement matching, a `start` / `delta` / `end` block lifecycle before the authoritative result, echoed output (trailing tool results echoed with the specified `Tool execution failed.` prefix for errors), a `toolUse` result for `required` or named choices, and fixture markers in the last user text (`[[decline]]`, `[[refuse]]`, `[[stall]]`, `[[think]]`, `[[tool]]`) for a declined prompt, a provider refusal, a generation that stays active until `cancel`, a display-only thinking block, and a call to the first supplied tool. It never executes a tool call. It returns typed failures rather than fabricated success. A malformed LLM request that still carries a non-empty `id` gets its `.result` with an `invalid-request` error, as the Wire Protocol requires; uncorrelated envelopes and napplet-emitted results are discarded. Passing mock conformance does not prove live inference, consent prompts, provider adapters, or billing behavior; test those in an LLM-capable host.

## BLOSSOM coverage

The reference shell answers the thirteen [NAP-BLOSSOM](https://github.com/napplet/naps/pull/71) wire operations with typed unavailable results (`unsupported`, `not-signed-in` or `server-list-unavailable`). Local URI helpers are available through the injected binding. These fixtures exercise request handling without network access or signing and do not establish live server availability, deletion, integrity verification or host network-policy conformance.

## Catalog integration

Envelope validation recognizes `catalog.get` with a string correlation `id`, and rejects napplet-emitted `catalog.get.result` as inbound-only traffic. `createReferenceShell` builds catalog snapshots from supplied host-verified, loadable manifest fixtures and shares selectors with intent discovery. The host checks each complete required-domain set before supplying a manifest; the caller's own domain grants are not the target napplet's compatibility set. Use `catalogFilter` to omit entries for a caller and `intentResolver: false` to exercise discovery without a resolver. It includes role-less entries and omits incomplete descriptors. The reference fixture is not a signature or artifact verifier. Use the maintained runtime prelude for browser catalog exercises. This non-normative guidance defers to the living [NAP-CATALOG draft](https://github.com/napplet/naps/pull/95).
