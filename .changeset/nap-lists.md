---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/shim": minor
"@napplet/sdk": minor
"@napplet/conformance": minor
---

Implement the draft NAP-LISTS surface from napplet/naps#68.

Adds the `lists` domain to `NapDomain`/`NAP_DOMAINS`, exposes
`window.napplet.lists.supported/add/remove`, publishes the
`@napplet/nap/lists` subpaths, re-exports SDK helpers and types, and teaches
the conformance envelope validator/reference shell about the `lists.*` wire
messages.
