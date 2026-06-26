# @napplet/conformance

> Framework-agnostic conformance engine for the napplet protocol — lets a napplet
> self-verify that it conforms to NIP-5D + the NAP wire protocol **before**
> publishing.

`@napplet/conformance` is a **development/testing tool**. It is not loaded inside
the napplet sandbox at runtime. One engine drives two scopes:

- **Headless / CI** — via the [`@napplet/conformance-cli`](./conformance-cli)
  `napplet-conformance` Playwright runner.
- **Standalone web runtime** — the single-window `apps/conformance` app.

v1 is **zero-config protocol conformance**: manifest/meta validity, boots under
`sandbox="allow-scripts"`, installs `window.napplet`, every emitted postMessage
envelope validates against the per-NAP validators, graceful degradation when
domain presence returns `false`, and no forbidden globals / undeclared egress.

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
- **`validateManifest(html)`** — checks the napplet's discovery meta tags
  (`napplet-type`, `napplet-aggregate-hash`, `napplet-requires`,
  `napplet-config-schema`) against NIP-5D / NIP-5A.
- **Reference mock shell**, **check registry**, and **reporters** that the CLI and
  the web runtime share.

The validator surface is kept in lockstep with `@napplet/nap` by a drift test, so
a new NAP message type cannot ship without matching conformance coverage.

```ts
import { validateEnvelope, validateManifest } from '@napplet/conformance';

validateEnvelope({
  type: 'relay.subscribe',
  id: 'a',
  subId: 'b',
  filters: [{ kinds: [1] }],
}).ok; // true

validateManifest(builtIndexHtml).ok; // true when the manifest is well-formed
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
