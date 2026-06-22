---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/shim": minor
"@napplet/sdk": minor
"@napplet/conformance": minor
"@napplet/skills": patch
---

Add NAP-POW as a shell-mediated NIP-13 proof-of-work job surface.

The new `pow` domain includes core types, `@napplet/nap/pow` subpaths,
`window.napplet.pow`, SDK helpers, conformance envelope coverage, reference-shell
responses, and skill/docs references. The API models POW as shell-owned jobs:
napplets submit templates, observe progress, inspect queue/hashrate state, and
pause/resume/cancel jobs while the shell owns CPU scheduling, identity stamping,
signing, publishing, consent, and policy.
