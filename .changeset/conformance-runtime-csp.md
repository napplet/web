---
"@napplet/conformance": minor
"@napplet/conformance-cli": minor
---

Replace the static forbidden-globals scan with a runtime check against the NIP-5D baseline Content Security Policy.

The harness now injects NIP-5D's conservative baseline CSP as the first element in `head` and records `securitypolicyviolation` events. The new advisory check `boot/csp-baseline` warns about every request the policy blocked, such as a direct `fetch`, a WebSocket, or an external image, without failing the run, because the CSP is SHOULD-level shell guidance. When the subject is served over http(s), the harness adds only that origin to `script-src`, `style-src`, `img-src`, `font-src`, and `base-uri`, so unbundled napplet directories still load. `connect-src`, workers, frames, and every other host stay blocked.

Removed: the `boot/no-forbidden-globals` error check, the CLI's regex source scan (`scanForbiddenGlobals`), the web app's `window.nostr` regex, and `forbiddenGlobals` on `ConformanceContext` / `BuildContextInput`. Storage and `window.nostr` references are no longer flagged: the sandbox already denies storage, and NIP-5D's `window.nostr` rule binds shells, not napplets. Hosts building contexts read `policyViolations` from the boot collection instead.
