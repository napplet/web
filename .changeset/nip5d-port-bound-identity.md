---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/shim": minor
"@napplet/conformance": minor
"@napplet/conformance-cli": minor
---

Follow NIP-5D port-bound identity ([nostr-protocol/nips#2303](https://github.com/nostr-protocol/nips/pull/2303), from dskvr/nips#14). The runtime now creates a `MessageChannel` before any napplet script runs, keeps one port private, and hands the other to the shell once with `window.parent.postMessage({ type: "napplet.hello" }, '*', [port])`. Every NAP envelope in both directions travels over that port, and window-level messages no longer reach the shims. Shells must bind the napplet's `(dTag, artifactHash)` to that port, answer only over it, and revoke the napplet and remove its frame on a second hello, any other window-level message, a second `load` or the port closing. Shells that key sessions on the iframe `Window` or reply with `iframeWindow.postMessage` must move to the port.

- `@napplet/core`: adds `sendPortEnvelope` and `EnvelopePort` with the same clone-mode handling as `sendEnvelope`.
- `@napplet/nap`: adds the `@napplet/nap/boundary` subpath (`connectShell`, `postToShell`, `onShellMessage`). The relay and storage shims listen on the port.
- `@napplet/shim`: `installNappletGlobal` and the prelude open the channel and send the single `napplet.hello` before installing domains.
- `@napplet/conformance`: the boot harness and `attachReferenceShell` bind the hello port (`attachReferenceShell` now takes `{ host, expectedSource }`, returns a `PortBinding`, and no longer takes `target`). Adds `bindNappletPort`, `transportViolations` on boot results and contexts, the `wire/port-only` check and the `lifecycle/keeps-verified-document` advisory.
- `@napplet/conformance-cli`: bundles the new harness, so napplets that post at window level now fail `wire/port-only`.
