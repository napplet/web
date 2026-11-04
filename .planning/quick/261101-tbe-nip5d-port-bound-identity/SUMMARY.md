---
quick_id: 261101-tbe
status: complete
date: 2026-11-01
---

# Summary: NIP-5D port-bound identity

The spec change is NIP-5D at nostr-protocol/nips#2303 head `51ef0cd`, which merged dskvr/nips#14. Identity moved from the reusable iframe `Window` to a per-document `MessagePort` handed over in `napplet.hello`.

- `@napplet/core`: added `sendPortEnvelope` / `EnvelopePort`, which share the clone-mode chokepoint.
- `@napplet/nap`: `boundary.ts` owns the realm's single channel and is published as `@napplet/nap/boundary` (`connectShell`, `postToShell`, `onShellMessage`). The relay and storage shims now listen on the port.
- `@napplet/shim`: `installNappletGlobal` sends one hello before installing domains and routes inbound messages only from the port.
- `@napplet/conformance`: the boot harness and `attachReferenceShell` bind the port and revoke the frame on a second hello, a window-level message, a second load or the port closing. Added `wire/port-only` (error) and `lifecycle/keeps-verified-document` (advisory).
- Tests: a shared fake shell (`packages/nap/src/test-support/fake-shell.ts`); all shim tests migrated; real-Chromium tests for a window-level bypass and a self-reload.
- Fixtures, docs, skills, README and the web explainer copy are updated. One minor changeset covers all five packages.

Verification: `pnpm build`, `pnpm type-check` and `pnpm -r test:unit` pass; the conformance e2e harness passes (5/5); the docs build passes; aislop is at 98/100, the baseline (deepmerge only).

Flagged, out of scope: kehto (the sibling reference shell) still keys sessions on `Window` and needs the same move to the port model.
