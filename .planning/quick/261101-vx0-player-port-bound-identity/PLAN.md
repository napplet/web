---
quick_id: 261101-vx0
slug: player-port-bound-identity
date: 2026-11-01
status: complete
---

# napplet.run player: NIP-5D port-bound identity

napplet.run's own shell is the app store preview player (`apps/web/src/lib/player`), not kehto. Its bootstrap defined `window.napplet` without the `napplet.hello` handoff that NIP-5D Transport now requires (nostr-protocol/nips#2303 @ 51ef0cd). It also kept showing the frame after the napplet navigated, and the navigated document ran without the injected CSP.

1. The bootstrap opens a `MessageChannel`, keeps port1 alive with a listener, and posts one `napplet.hello` with port2 before any napplet script runs.
2. `binding.ts` accepts one hello carrying exactly one port from the created frame. A second hello, a window-level message, a second `load` or the port closing removes the frame (NIP-5D Identity).
3. The controller sets `srcdoc` before inserting the frame (otherwise an about:blank load reads as a second load), releases old bindings first, and shows Retry after a replacement.
4. Tests, README.
