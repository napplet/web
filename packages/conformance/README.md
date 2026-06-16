# @napplet/conformance

Framework-agnostic conformance engine for the napplet protocol. It lets a napplet
self-verify that it conforms to NIP-5D + the NAP wire protocol **before** publishing,
in two scopes that share this one engine:

- **Headless / CI** — driven by the `napplet-conformance` Playwright CLI.
- **Standalone web runtime** — the single-window `apps/conformance` app.

v1 is **zero-config protocol conformance**: manifest/meta validity, boots under
`sandbox="allow-scripts"`, installs `window.napplet`, every emitted postMessage
envelope validates against the per-NAP validators, graceful degradation when
`shell.supports()` returns false, and no forbidden globals / undeclared egress.

## What's in the box

- `validateEnvelope(msg)` — runtime validation of any `domain.action` envelope a
  napplet emits, across all 16 NAP domains. Catches malformed payloads, unknown
  types, and napplets that put shell→napplet (inbound) traffic on the wire.
- `validateManifest(html)` — checks `napplet-type`, `napplet-aggregate-hash`,
  `napplet-requires`, `napplet-config-schema`, connect origins (via the canonical
  `normalizeConnectOrigin`), and the no-inline-`<script>` rule.

The validator surface is kept in lockstep with `@napplet/nap` by a drift test, so a
new NAP message type cannot ship without matching conformance coverage.

```ts
import { validateEnvelope, validateManifest } from '@napplet/conformance';

validateEnvelope({ type: 'relay.subscribe', id: 'a', subId: 'b', filters: [{ kinds: [1] }] }).ok; // true
validateManifest(builtIndexHtml).ok; // true when the manifest is well-formed
```

> This package is a development/testing tool. It is not loaded inside the napplet
> sandbox at runtime.
