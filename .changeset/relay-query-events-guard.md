---
"@napplet/nap": patch
"@napplet/shim": patch
---

Guard relay query results so malformed host responses without an `events` array
resolve to `[]` instead of leaking `undefined` through the typed query contract.
