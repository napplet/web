---
quick_id: 261120-r3c
status: complete
branch: fix/conformance-runtime-csp
---

# Replace the forbidden-globals scan with a runtime CSP check

NIP-5D (nips#2303 @ f60550c3) §Security, Content Security Policy advisory: shells SHOULD inject the conservative baseline CSP as the first `head` element. The old `boot/no-forbidden-globals` error was a regex over napplet source with no napplet-side clause behind it (the `window.nostr` rule binds shells; storage is described as already denied by the sandbox), and the CLI and web app disagreed.

The harness now injects the baseline (plus the subject's own http(s) origin for script/style/img/font/base so unbundled directories load) and records `securitypolicyviolation`. New advisory `boot/csp-baseline` warns on blocked requests. Removed scan.ts, the web regex, and `forbiddenGlobals`.

Verification: build, type-check, pnpm -r test:unit, check:jsr, skills/protocol/agent-output, e2e 6/6 (new direct-network fixture: fetch, WebSocket, external img all reported, run still ok), aislop 93/100.
