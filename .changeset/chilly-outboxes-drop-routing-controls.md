---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/sdk": minor
---

Align NAP-OUTBOX with the current draft by removing caller-visible routing and lifecycle controls. `OutboxStrategy` is no longer exported, `strategy` is no longer accepted on outbox option objects, and `OutboxSubscribeOptions` no longer accepts `live`; subscription lifecycle is represented by the handle plus `outbox.close` / `outbox.closed`.
