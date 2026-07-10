# @napplet/conformance

Framework-agnostic conformance engine for the napplet protocol. It lets a napplet
self-verify that it conforms to NIP-5D + the NAP wire protocol **before** publishing,
in two scopes that share this one engine:

- **Headless / CI** — driven by the `napplet-conformance` Playwright CLI.
- **Standalone web runtime** — the single-window `apps/conformance` app.

v1 is **zero-config protocol conformance**: NIP-5D manifest-event validity, boots
under `sandbox="allow-scripts"`, receives runtime-injected `window.napplet`, every
emitted postMessage envelope validates against the per-NAP validators, graceful
degradation when domains are absent, and no forbidden globals.

## What's in the box

- `validateEnvelope(msg)` — runtime validation of any `domain.action` envelope a
  napplet emits, across all active NAP domains. Catches malformed payloads,
  unknown types, and napplets that put shell→napplet (inbound) traffic on the wire.
- `validateManifestEvent(event)` — checks that a resolved Nostr event is a NIP-5D
  napplet manifest (`5129`, `15129`, or `35129`) with a hashed `/index.html` path
  and bare known `requires` domains.
- `validateManifest(html)` — compatibility wrapper for older HTML-only harnesses.
  HTML alone cannot prove a signed NIP-5D manifest event.

The validator surface is kept in lockstep with `@napplet/nap` by a drift test, so a
new NAP message type cannot ship without matching conformance coverage.

```ts
import { validateEnvelope, validateManifestEvent } from '@napplet/conformance';

validateEnvelope({ type: 'relay.subscribe', id: 'a', subId: 'b', filters: [{ kinds: [1] }] }).ok; // true
validateManifestEvent(resolvedManifestEvent).ok; // true when the NIP-5D event is well-formed
```

> This package is a development/testing tool. It is not loaded inside the napplet
> sandbox at runtime.

## Install

```sh
pnpm add -D @napplet/conformance
```

JSR consumers can import the same source package:

```ts
import { runConformance, validateEnvelope, validateManifest } from 'jsr:@napplet/conformance';
```

Most application projects should use the `napplet-conformance` CLI wrapper in CI.
Use this package directly when you are embedding the engine in a custom harness,
building a shell-side test runtime, or validating individual envelopes and
resolved manifest events in unit tests.

## Common Workflows

### Validate one envelope

```ts
import { validateEnvelope } from '@napplet/conformance';

const verdict = validateEnvelope({
  type: 'storage.get',
  id: 'request-1',
  key: 'settings',
});

if (!verdict.ok) {
  console.error(verdict.errors);
}
```

### Validate a resolved manifest event

```ts
import { validateManifestEvent } from '@napplet/conformance';

const verdict = validateManifestEvent(resolvedManifestEvent);

if (!verdict.ok) {
  throw new Error(verdict.errors.map((e) => e.message).join('\n'));
}
```

### Run the full engine

```ts
import { makeContext, runConformance } from '@napplet/conformance';

const context = makeContext({
  manifestHtml: '<!doctype html><html><head></head><body></body></html>',
});
const run = runConformance(context);

for (const check of run.checks) {
  console.log(check.id, check.status);
}
```

## Public Surface

- Envelope validation: `validateEnvelope`, `knownEnvelopeTypes`, `ENVELOPE_SPECS`
- Manifest validation: `validateManifestEvent`, `validateManifest`
- Reference shell harness: `createReferenceShell`, `attachReferenceShell`
- Browser boot collection: `bootAndCollect`
- Context helpers: `makeContext`, `buildContext`
- Runner and report helpers: `runConformance`, `toJson`, `toPretty`, `toJUnit`

## CLI Pairing

The package intentionally stays framework-agnostic. For a project-level command
that launches real Chromium against a built napplet, use the companion
`napplet-conformance` CLI shipped from `@napplet/conformance-cli`.
