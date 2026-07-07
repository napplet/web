---
"@napplet/nap": patch
"@napplet/conformance": patch
"@napplet/conformance-cli": patch
"@napplet/skills": patch
---

Harden napplet sandbox authoring and verification.

- `@napplet/nap` decodes `data:` resource URLs without using browser `fetch`.
- `@napplet/conformance-cli` flags direct browser network, storage, cookie, and external network-loaded asset surfaces in served napplet code.
- `@napplet/conformance` reports the broader forbidden-surface check accurately.
- `@napplet/skills` moves the sandbox authority contract into the top-level authoring flow so generated napplets route bytes, state, relays, signing, and links through shell-owned NAPs.
