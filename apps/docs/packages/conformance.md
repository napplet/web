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

- **npm:** [`@napplet/conformance`](https://www.npmjs.com/package/@napplet/conformance)
- **JSR:** [`@napplet/conformance`](https://jsr.io/@napplet/conformance)
- **Source:** [packages/conformance](https://github.com/napplet/napplet/tree/main/packages/conformance)

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

`bootAndCollect({ url, html, runtimePreludeSource, verifiedManifest })` accepts an optional loaded HTML snapshot, the maintained shim IIFE source, and a manifest already verified by the loading host. The CLI reads `@napplet/shim/prelude.global`; Vite hosts can import it with `?raw`. Supplying `html` avoids refetching an artifact after the host verifies its signature and raw bytes. The engine remains browser-safe and does not import Node APIs or bundled asset loaders. Signed CLI runs pass the actual verified manifest through `verifiedManifest`, so navigation eligibility uses that napplet's advertised conventions and parameter names. Unsigned local runs use the reference fixture only; they do not establish eligibility for a published artifact. `verifiedManifest` is trusted host input, not a replacement for signature and artifact-hash verification.

Without `runtimePreludeSource`, the embedded compatibility fixture exposes only RESOURCE and GAMEPAD bindings. Other domain properties are absent, rather than empty objects advertising unusable methods. Use the maintained source for full reference-shell exercises. `installedGlobal` records observed installation independently from `bootError`; an app failure does not imply injection failed. Signature/hash verification belongs to the loading host, while `validateManifestEvent` checks the event structure. This is non-normative implementation guidance; consult the living [NIP-5D proposal](https://github.com/nostr-protocol/nips/pull/2303) and [NAPs](https://github.com/napplet/naps).

## Reference navigation history

The reference shell implements the [NAP-NAVIGATION draft](https://github.com/napplet/naps/pull/126) with the [NAP-INTENT delivery draft](https://github.com/napplet/naps/pull/128). This is non-normative testing guidance, not a production shell policy. Bind a live endpoint with `registerEndpoint(endpoint)` and its already verified `manifest` before exercising history. Each endpoint keeps independent reports, visits, delivery IDs, and pending traversal state.

`navigation.report` / `navigation.get` receive correlated results, including structured rejections for recognized requests with usable IDs. Validation covers report shape, exact advertised conventions and parameter lists, JSON values, revision ordering, and rejection recovery. Runtime tests cover retained history, duplicate invocations, traversal correlation, timeout/late reports, and endpoint isolation.

Shell-side fixture methods are `navigationView(endpointId)`, `revisit(endpointId, entryId)`, `pruneNavigation(endpointId, keepIds)`, and `terminateEndpoint(endpointId)`. `deliverIntent(endpointId: string, request: IntentRequest): IntentDelivery | undefined` takes an already normalized request, not a URI, and delivers it to that existing endpoint with shell provenance; `retryIntent(endpointId, deliveryId)` preserves the issued delivery. These are host test controls, not new NAP wire operations or APIs exposed to napplet code. The `navigation` options set `maxEntries`, `maxLocationBytes`, `timeoutMs`, `canReport`, and `canRevisit`; the fixture defaults to 100 entries, 65,536 location bytes, and a 30-second pending timeout.

A production host supplies verified endpoint metadata, consent/policy, UI controls, and actual rendering checks. The reference runtime does not prove that an accepted report matches rendered content. See the [navigation guide](/naps/navigation) for application integration.
