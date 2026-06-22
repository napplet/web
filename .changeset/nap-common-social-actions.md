---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/sdk": minor
"@napplet/shim": minor
"@napplet/conformance": patch
---

Add NAP-COMMON common social actions.

The new `common` domain exposes shell-mediated public NIP-19 encode/decode,
profile lookup, follows, follow/unfollow, reactions, and reports. The shell owns
identity, consent, event construction, signing, publishing, relay access, and
NIP-19 handling.
