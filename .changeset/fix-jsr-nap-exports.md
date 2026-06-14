---
"@napplet/nap": patch
---

Fix JSR publishing: `@napplet/nap`'s `jsr.json` exports map was missing the
`cvm` and `outbox` subpaths (it had drifted from `package.json`), so JSR
consumers and dependent packages could not resolve `@napplet/nap/cvm` or
`@napplet/nap/outbox`. The version-sync tooling now regenerates the `jsr.json`
exports from `package.json` on every release so the two can no longer drift.
