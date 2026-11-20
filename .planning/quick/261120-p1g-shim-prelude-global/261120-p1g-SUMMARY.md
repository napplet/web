---
quick_id: 261120-p1g
status: complete
branch: fix/shim-prelude-global
---

# Make the shim prelude activation global single-use

NIP-5D (nips#2303 @ f60550c3) §Security 5: "Runtime injection … MUST be limited to the `window.napplet` namespace". The tsup IIFE `globalName` emitted a top-level `var NappletShimPrelude`, a non-deletable global that napplet code could call to install every domain.

New IIFE entry `src/prelude-global.ts` defines a configurable, non-enumerable, frozen `NappletShimPrelude` whose `install()` deletes it before installing (even when install throws). Activation call string unchanged, so shells keep working.

Verification: build, type-check, `pnpm -r test:unit`, check:jsr, skills/protocol/agent-output, e2e harness 5/5 (real browser with the rebuilt artifact), aislop 93/100 (main baseline).
