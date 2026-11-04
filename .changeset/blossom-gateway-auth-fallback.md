---
"@napplet/cli": patch
---

`napplet deploy` now moves on to the next Blossom auth token when an upload gets HTTP 502, 503 or 504. A CDN in front of a server can turn an early auth rejection into one of these statuses on larger uploads, which used to fail the deploy before the unscoped token was tried. Other 5xx responses still fail without a retry.
