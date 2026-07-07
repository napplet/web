---
"@napplet/core": patch
"@napplet/nap": patch
"@napplet/sdk": patch
---

Align `CommonProfileResult` with NAP-COMMON by returning the relay-owned
`RelayEventResult` wrapper as `result` instead of split `event` and `relays`
fields.
