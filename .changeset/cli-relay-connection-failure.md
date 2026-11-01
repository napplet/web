---
"@napplet/cli": patch
---

Report a relay that deploy could not connect to as a failed publish. nostr-tools resolves unreachable relays with a `connection failure` reason instead of rejecting, which the deploy report previously counted as published.
