---
phase: 163
status: passed
threats_open: 0
verified: 2026-10-12
---

# GAMEPAD security review

Non-normative code review against the living [NAP-GAMEPAD](https://github.com/napplet/naps/pull/108) Shell Behavior/Security Considerations and [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303) Transport/Security Rationale. Canonical heads rechecked unchanged on 2026-10-12: GAMEPAD 0b28f77e3dfa0f07dd7c0f9d61a7090ee99f3a5e; NIP-5D 020cb8b33a9e4c6b8ca4b2f9d0ed0a67843b68f7.

| Threat | Implemented boundary | Proof |
| --- | --- | --- |
| Untrusted state injection | Portable, reference, and Kehto bindings require parent message source and validate state before caching. | Parent/sibling trust regressions; malformed state/id/range tests. |
| Cross-frame live controller leakage | Runtime recipient identity comes from the registered Window; live controls require trusted input ownership and active host focus/visibility. | Two-window broker vectors; Chromium iframe focus transfer and host/tab focus loss. |
| Timing leakage through neutral state | Unfocused views retain connected metadata with axes/buttons neutral and timestamp zero; unchanged views do not receive repeated live timestamps. | Broker unit vectors and Chromium snapshots. |
| Native bypass | Every Paja/playground loading path applies controller Permissions-Policy denial before execution. Reference iframes deny gamepad, HID, and USB too. | Real opaque Chromium frames throw SecurityError on native getGamepads; policy preservation/idempotency regression. |
| Mutating shared cached state | Bindings copy nested arrays/buttons for callers and each listener. | Cache/fanout mutation regressions. |
| Polling/subscription abuse or teardown leak | Shared frame loop, per-source repeated-subscribe limit, unconditional unsubscribe, generation cancellation, session/service cleanup. | Broker frame cancellation, rate limit, stale callback, destruction and unregister regressions. |
| Fabricated identity/authority handshake | Source identity and frozen grants are host-owned and independent of optional SHELL readiness. No new capability or message is introduced. | Immediate subscribe without SHELL; unknown-source and disabled-domain routing tests. |

The optional native Gamepad API replacement is not implemented. The proposal permits it while NIP-5D currently limits runtime injection to window.napplet; the conflict is surfaced for clarification. Required domain support and physical-access denial do not depend on it. No cloud deployment, account authority, key material, haptics, or raw device handles are introduced by this change.
