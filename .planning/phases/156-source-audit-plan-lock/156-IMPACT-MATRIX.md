# Phase 156 Impact Matrix

Canonical source: NIP-5D PR #2303 head `6ca56324a3764a17141e681225f0aaa0ad45a5b6`.

## Runtime Truths

- Runtime injects `window.napplet` before any napplet script runs.
- `window.napplet` contains only exposed NAP domain objects.
- Domain presence means available; domain absence means unavailable.
- No current NIP-5D text defines `window.napplet.shell`, `shell.supports()`, `shell.ready`, or `shell.init`.
- Runtime injection is outside the signed artifact and must not change bytes used for aggregate hash.

## Code Surfaces

| Surface | Current stale surface | Required migration |
| --- | --- | --- |
| `packages/core` | `ShellSupports`, `NappletShell`, `ShellEnvironment`, required `NappletGlobal.shell` | Remove generic shell types, make domain properties optional, keep NAP domain envelope types only. |
| `packages/nap` | `@napplet/nap/shell` subpath and shell shim/sdk helpers | Remove shell subpath from package, JSR, and tsup exports. |
| `packages/shim` | Emits `shell.ready`, waits for `shell.init`, installs `window.napplet.shell.supports()` | Expose runtime injection installer that writes selected domain objects and registers message routing without handshake. |
| `packages/sdk` | Examples/guards can assume generic shell capability query | Use property-presence guards and clear missing-domain errors. |
| `packages/conformance` | Boot readiness and reference shell depend on shell handshake | Inject runtime namespace before fixture code and validate NAP domain traffic only. |
| `packages/conformance-cli`, `apps/conformance`, `tests/fixtures/napplets` | Fixtures/checks teach handshake or supports fallback | Exercise injected namespace and domain absence. |
| `README.md`, `apps/docs`, `docs`, package READMEs | Stale NAP-SHELL/supports/bootstrap prose | Rewrite as non-normative guidance that defers to live NIP-5D/NAPs. |
| `packages/skills`, `skills`, `packages/boilerplate` | Agent/user guidance may tell authors to import shim for bootstrap | Teach runtimes inject; napplets consume injected domains/types/SDK. |

## Stale Surface Gate

Release verification must run a zero-match/classified-exception audit for:

`shell.supports|shell.ready|shell.init|window.napplet.shell|ShellEnvironment|NAP-SHELL|@napplet/nap/shell`

Allowed exceptions must be historical planning artifacts or explicit "removed stale surface" notes, never live package/runtime/conformance guidance.
