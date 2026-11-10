---
quick_id: 261110-g3f
status: complete
date: 2026-11-10
commit: 26ddb4d5
---

# Summary: optional @kehto/paja peer for conformance-cli

- `@kehto/paja` is now an optional peer (`>=0.21.0`) plus a devDependency. `loadPaja()` imports it on demand and explains how to install it when `ERR_MODULE_NOT_FOUND` is raised.
- Tests: `screenshot-preview-missing.test.ts` covers the hint and the rethrow; the existing preview test still passes against the dev copy of Paja.
- Docs: the README and the docs page replace the stale "requires Paja 0.21.x" paragraph.
- Changeset: `@napplet/conformance-cli` minor.
- Upstream: kehto/web#416 asks for a Paja release that accepts core 0.40 / nap 0.39.
- Lockfile: only the conformance-cli importer entry changed. pnpm's re-resolution of security-lab's Kehto peers to the newly published core 0.40 was dropped as unrelated.
- Verification: build 13/13, type-check 21/21, all unit suites green, aislop 99/100 (known deepmerge advisory).
