---
quick_id: 261101-tbe
slug: nip5d-port-bound-identity
date: 2026-11-01
status: complete
---

# Chase NIP-5D port-bound identity

The NIP-5D head (nostr-protocol/nips#2303 at `51ef0cd`, which merged dskvr/nips#14) closes a security flaw: identity used to be bound to the iframe `Window`, which survives same-frame navigation, so a document loaded later in that frame inherited the napplet's `(dTag, artifactHash)` and grants, without the injected `meta` CSP. The spec now binds identity to a per-document `MessagePort`.

## Spec clauses (5D.md at 51ef0cd)

- Transport: the injected bootstrap MUST, before any napplet script runs, create a `MessageChannel`, keep one port private (not reachable from napplet code) and transfer the other to the shell exactly once with `window.parent.postMessage({ type: "napplet.hello" }, '*', [port])`. All NAP messages in both directions MUST go over the port. Shells MUST NOT send NAP messages with `iframeWindow.postMessage` and MUST NOT transfer a port into the iframe.
- Transport: the shell accepts `napplet.hello` only when `MessageEvent.source` is the `contentWindow` of an iframe it created and exactly one port is attached.
- Identity: bind `(dTag, artifactHash)` to the port from the first valid hello. A second hello, any other window-level message after the handoff, a second `load` or the port closing means the document was replaced: close the port, revoke the binding and its grants, remove the iframe. NAP messages from any other source MUST NOT be processed.

## Work

1. `@napplet/core`: `sendPortEnvelope(port, message)` beside `sendEnvelope`, sharing the clone-mode logic. It posts without a target origin, because `MessagePort.postMessage` takes none.
2. `@napplet/nap`: `boundary.ts` owns the realm's only channel: `connectShell()` (idempotent, sends the single hello), `postToShell()` (sends over the port), and `onShellMessage()` (inbound fan-out from the port only). The port is never exported. It is published as a `@napplet/nap/boundary` subpath so `@napplet/shim` shares the same module instance. The relay and storage shims move from window `message` listeners to `onShellMessage`.
3. `@napplet/shim`: `installNappletGlobal` calls `connectShell()` before installing domains, and routes inbound messages from `onShellMessage`, dropping the `event.source === window.parent` path.
4. `@napplet/conformance`: the boot harness acts as a NIP-5D shell. It binds the port from the first valid hello, answers over the port, and records transport violations (a second hello, a NAP message at window level, a second load) and tears down the frame. A new check, `wire/port-only`, fails napplets that post window-level messages or navigate their frame, citing the Transport and Identity sections. `attachReferenceShell` moves to the port model.
5. Tests: a shared fake-channel test helper, and all shim tests migrated to it.
6. Fixtures, docs, skills, READMEs and web explainer copy: say "over the `MessagePort` handed over in `napplet.hello`" instead of `window.parent.postMessage` / `MessageEvent.source` identity.
7. Changesets for core, nap, shim, conformance and conformance-cli.

## Out of scope / flag

- kehto (sibling reference shell) still keys on `Window`. Flag it to the user, don't edit it here.
- The apps/web player injects no runtime and exposes no NAP, so there is no identity to bind.
