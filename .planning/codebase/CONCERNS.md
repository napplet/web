> Historical implementation context, non-normative. Protocol descriptions below may predate the current NIP-5D event schema. Read the actual `5D.md` at the head of [upstream PR 2303](https://github.com/nostr-protocol/nips/pull/2303/files) and the living [NAPs](https://github.com/napplet/naps) before implementing protocol behavior. NIP-5A aggregate-hash manifests and old registration handshakes are not current NIP-5D authority.

# Codebase Concerns

**Analysis Date:** 2026-03-29

## Tech Debt

**No explicit test suite:**
- Issue: Zero test files found (`*.test.ts`, `*.spec.ts`) across all three packages. All packages have only `build` and `type-check` scripts; no test runner configured.
- Files: `packages/shell/package.json`, `packages/shim/package.json`, `packages/vite-plugin/package.json`
- Impact: Critical protocol logic (AUTH handshake, ACL enforcement, storage proxying, replay attack detection) ships untested. Regressions will only be discovered when hyprgate integration fails or in production.
- Fix approach: Add vitest or jest to root `package.json` with shared config. Write unit tests for core functions in `pseudo-relay.ts` (replay check, ACL check, message dispatch), `acl-store.ts` (grant/revoke/block logic), `storage-proxy.ts` (quota calculation), and `relay-shim.ts` (subscription lifecycle).

**Lossy storage quota calculation:**
- Issue: Storage quota in `packages/shell/src/storage-proxy.ts` (line 31) uses `new Blob([key, value]).size` which counts UTF-16 encoded bytes, not actual UTF-8 string storage. Real localStorage uses UTF-16 internally on most browsers, but this calculation method is inconsistent across platforms.
- Files: `packages/shell/src/storage-proxy.ts` lines 18-34, 87-88
- Impact: Napps may hit quota unexpectedly (by 2x) on some browsers, or exceed quota on others. Inconsistent behavior across environments.
- Fix approach: Standardize quota calculation to UTF-8 byte count (use `new TextEncoder().encode(key + value).length`) or document the platform assumption clearly and test on multiple browsers.

**Missing event ID validation:**
- Issue: Event IDs injected by `injectEvent()` in `packages/shell/src/pseudo-relay.ts` (line 600) are not cryptographically valid. They are generated as `crypto.randomUUID().replace(/-/g, '').slice(0, 64).padEnd(64, '0')` — this is a fake hex string, not a real SHA-256 hash. Napplets may try to verify these event IDs and fail.
- Files: `packages/shell/src/pseudo-relay.ts` lines 598-607
- Impact: Shell-injected inter-frame events fail signature/hash verification. Napplets expecting valid event IDs may reject them.
- Fix approach: Either (a) compute real SHA-256 hash of event fields, or (b) document that shell-injected events are unsigned/unverified and should not be trusted for identity claims.

**Permissive ACL default (security risk):**
- Issue: In `packages/shell/src/acl-store.ts` line 57, `check()` returns `true` for unknown identities: `if (!entry) return true;`. This is intentionally permissive — all capabilities granted by default.
- Files: `packages/shell/src/acl-store.ts` lines 54-60
- Impact: If ACL persistence fails or an entry is skipped during load, napps get full capabilities. A misconfigured shell or malicious napp that doesn't register properly can exploit this.
- Fix approach: Add a configuration option to toggle PERMISSIVE vs RESTRICTIVE default. Add audit logging when granting capabilities to unknown identities. Document the default policy prominently in README.

## Known Bugs

**localStorage unavailability crashes softly:**
- Symptoms: If `localStorage` is unavailable (private browsing, storage quota exceeded, etc.), the entire ACL and manifest cache become ephemeral. Next page load, all ACL decisions are lost.
- Files: `packages/shell/src/acl-store.ts` lines 108-125, 127-157; `packages/shell/src/manifest-cache.ts` lines 39-59
- Trigger: Run in private browser window or with localStorage disabled
- Workaround: Shell implementors must provide `localStorage`-equivalent via hooks if building for restrictive environments. Currently no hook-based persistence mechanism exists.

**Race condition in AUTH handshake with queued messages:**
- Symptoms: If a napp sends REQ/EVENT messages before AUTH completes, they queue in `pendingAuthQueue`. If AUTH is rejected, the queued messages may still execute if the rejection callback doesn't fully clear the queue under all error paths.
- Files: `packages/shell/src/pseudo-relay.ts` lines 50, 575-580, 186-189, 214-216
- Trigger: Napp sends REQ immediately on page load, before AUTH completes; shell rejects AUTH for any reason
- Workaround: Ensure napplets always wait for AUTH to complete before sending REQ (shim does this via `keypairReady` promise, but shell doesn't enforce it).

**Manifest cache key collision (dTag collision risk):**
- Symptoms: Manifest cache uses `pubkey:dTag` as key (not composite `pubkey:dTag:aggregateHash`). If the same napp pubkey runs two different builds (same dTag, different hash), the old build's manifest is overwritten and never recovered.
- Files: `packages/shell/src/manifest-cache.ts` lines 15-16, 20-21
- Trigger: Deploy updated build of napp without changing dTag, then roll back to old version
- Workaround: Always increment dTag when changing napp builds. Currently no validation of this constraint.

## Security Considerations

**Unvalidated relay responses:**
- Risk: The shell's relay pool queries (in `packages/shell/src/pseudo-relay.ts` lines 289-323) do not validate event signatures or replay before delivering to napplets. Malicious relays can inject forged events into subscriptions.
- Files: `packages/shell/src/pseudo-relay.ts` lines 296-323
- Current mitigation: Shell-level validation is not performed; napplets are expected to validate events themselves via `nostr-tools`.
- Recommendations: Add optional relay validation hooks. Document that relays are untrusted and napplets must verify all critical events. Consider checksum verification at subscription time.

**postMessage origin '*':**
- Risk: Both shell and shim use `postMessage(..., '*')` to send messages. Any page/iframe on the domain can listen and forge messages. The only protection is Window reference checking in `origin-registry.ts`.
- Files: `packages/shell/src/pseudo-relay.ts` (all postMessage calls use `'*'`); `packages/shim/src/index.ts` (all postMessage calls use `'*'`); `packages/shell/src/origin-registry.ts` lines 11-26
- Current mitigation: Origin registry validates `event.source` (the Window object), which is unforgeable. But if a page can inject an iframe or guess window references, messages can leak.
- Recommendations: Consider tightening to specific origins where known, or add message signing for critical operations (ACL changes, signer requests). Document this as a trust boundary.

**No rate limiting on signer requests:**
- Risk: A malicious napp can spam signer requests (`kind 29001` events) and exhaust the shell's resources or cause excessive user prompts (for destructive kinds).
- Files: `packages/shell/src/pseudo-relay.ts` lines 344-399
- Current mitigation: None. Timeout is 30 seconds per request (line 153 of `packages/shim/src/index.ts`), but no cap on concurrent requests.
- Recommendations: Add per-napp rate limits on signer requests and consent prompts. Track request frequency and block repeat offenders. Document expected behavior under abuse.

**Storage quota exhaustion DoS:**
- Risk: A napp can intentionally fill its 512 KB quota to prevent other instances (if they share the same pubkey:dTag:aggregateHash) from storing data.
- Files: `packages/shell/src/storage-proxy.ts` lines 86-92
- Current mitigation: Per-napp 512 KB quota enforced. But if multiple instances of the same napp run, they share the quota.
- Recommendations: Consider per-instance quota isolation using session/window tokens. Document quota semantics clearly for napp developers.

## Performance Bottlenecks

**Linear localStorage iteration in storage quota calculation:**
- Problem: Every storage write iterates `localStorage.length` (potentially thousands of entries) to calculate current bytes used. This happens on every `storage-set` request.
- Files: `packages/shell/src/storage-proxy.ts` lines 18-34, 88
- Cause: No index of per-napp storage size. localStorage offers no query API.
- Improvement path: Cache total bytes per napp identity in a secondary map. Update cache on set/remove. Rebuild cache on startup from localStorage scan.

**Subscription filter matching walks all events:**
- Problem: `matchesAnyFilter()` checks every event in the ring buffer against every filter on every new event delivery. With 100-event buffer and multiple filters, this is O(n*m) per incoming event.
- Files: `packages/shell/src/pseudo-relay.ts` lines 75-94, 96-112
- Cause: Ring buffer is a simple array. No indexing by kind, author, or tag.
- Improvement path: Add in-memory index (Map<kind, Set<eventId>>, etc.) to pre-filter candidates. Trade memory for speed. Or use a library like `lunr` or `flexsearch` for complex queries.

**Event buffer is fixed-size ring, no expiry:**
- Problem: 100-event buffer persists indefinitely. Very old events (hours old) are still matched against new subscriptions, wasting CPU on old data.
- Files: `packages/shell/src/pseudo-relay.ts` lines 49-53, 115-116
- Cause: Simple ring buffer design. No timestamp-based eviction.
- Improvement path: Add time-based eviction (e.g., drop events older than 1 hour). Or implement a proper LRU cache with TTL.

## Fragile Areas

**Inter-frame event delivery with no ordering guarantee:**
- Files: `packages/shell/src/pseudo-relay.ts` lines 96-112
- Why fragile: Events are delivered to all subscribers that match filters, but no guarantee of order across multiple napplets. A napplet might receive events out of order, causing state inconsistency if it assumes causality.
- Safe modification: Document event ordering assumptions clearly. Add sequence numbers or causal tracking if order is critical. Test subscription delivery order in integration tests (currently missing).
- Test coverage: None. No test for multi-subscriber inter-frame event delivery.

**Storage proxy response parsing is trusting:**
- Files: `packages/shim/src/storage-shim.ts` lines 41-68
- Why fragile: Assumes response event tags are well-formed (find returns array with [1], etc.). If shell sends malformed response, parsing fails silently or returns undefined.
- Safe modification: Add defensive tag parsing with fallbacks. Throw clear errors if response format is invalid. Add type guards.
- Test coverage: None. No test for malformed storage responses.

**Keypair loading assumes localStorage:**
- Files: `packages/shim/src/napp-keypair.ts` (not fully read, but referenced in index.ts line 307-310)
- Why fragile: Ephemeral keypair if localStorage unavailable. Each session gets a new keypair, breaking napp identity across reloads.
- Safe modification: Add hook for persistent storage backend. Document localStorage requirement clearly.
- Test coverage: None. No test for private browsing or storage unavailability.

**Manifest cache load happens on first AUTH only:**
- Files: `packages/shell/src/pseudo-relay.ts` lines 169 (manifestCache.get), not explicitly loaded
- Why fragile: `manifestCache.load()` must be called by shell implementor during setup. If skipped, cache is always empty and updates are lost.
- Safe modification: Auto-load cache in `createPseudoRelay()` before returning. Make load() idempotent.
- Test coverage: None. No test for missing init call.

## Scaling Limits

**Ring buffer capped at 100 events:**
- Current capacity: 100 inter-frame events in memory
- Limit: Beyond 100 events, old events drop off silently. Long-running shells with lots of inter-frame traffic lose history.
- Scaling path: Make buffer size configurable. Implement disk-backed or worker-relay backed event store. Add compression.

**localStorage size limit for ACL and manifest cache:**
- Current capacity: Depends on browser (typically 5-10 MB per origin)
- Limit: As napp count grows (50+), ACL and manifest cache entries accumulate. Eventually localStorage quota exhausted, persistence fails silently.
- Scaling path: Implement LRU eviction in ACL store. Use IndexedDB for persistence instead of localStorage (not yet available). Add garbage collection of old manifest entries.

**Single pseudo-relay instance per shell:**
- Current capacity: One relay instance handles all napplets in the shell
- Limit: If shell hosts 100+ napplets with active subscriptions, a single relay instance becomes a bottleneck. Message dispatch is sequential.
- Scaling path: No immediate fix. Consider multi-threaded relay or worker-based sharding (future major version).

## Dependencies at Risk

**nostr-tools peer dependency, no version lock:**
- Risk: `packages/shell/package.json` and `packages/shim/package.json` declare `nostr-tools` as peer dependency with range `>=2.23.3 <3.0.0`. User can install any version in that range. Breaking changes in minor versions could break napplets.
- Impact: If a user installs `nostr-tools@2.30.0` and it changes `finalizeEvent()` behavior, shim breaks.
- Migration plan: (1) Tighten peer dependency to patch version (`^2.23.3` becomes `~2.23.3`), or (2) pin in root `pnpm-lock.yaml` and document locked version in README.

**vite-plugin build-time dependency on nostr-tools:**
- Risk: Plugin dynamically imports `nostr-tools` at build time (line 130 of `packages/vite-plugin/src/index.ts`). If import fails, manifest generation is silently skipped. Users don't know their manifest wasn't signed.
- Impact: Unsigned manifests treated as valid. Napplets run without integrity verification.
- Migration plan: (1) Make nostr-tools a required dev dependency for build, not dynamic import, or (2) fail build loudly if manifest signing is requested but fails.

## Missing Critical Features

**No async napp initialization hook:**
- Problem: Napplets have no way to signal to the shell that they're ready for messages. Currently, shell must wait for AUTH handshake (triggered by `sendChallenge()`) before napplet is usable. If shell loads 50 napplets, each AUTH handshake is a separate round-trip.
- Blocks: Efficient napplet batch initialization. Bulk capability grants at startup.

**No subscription filters on napp type/dTag:**
- Problem: Napples can subscribe to any inter-frame event from any other napp. There's no built-in capability to restrict napplets to events from specific napp types (e.g., only listen to events from `type:chat`).
- Blocks: Privacy-preserving napplet ecosystems. Napplets currently must check source pubkey manually.

**No key rotation for napp ephemeral keypair:**
- Problem: Napp keypair is generated once and stored in localStorage (or lost on private browsing). No way to rotate compromised keypairs without losing napp identity.
- Blocks: Secure key recovery. Keylogger/malware mitigation at napplet level.

**No manifest signature verification in shell:**
- Problem: Shell loads napplets but never verifies `.nip5a-manifest.json` signatures. Tampering with manifest is undetected.
- Blocks: Integrity verification of napplet code. Supply-chain security.

## Test Coverage Gaps

**Pseudo-relay message dispatch:**
- What's not tested: `handleMessage()` with various verb types (EVENT, REQ, CLOSE, COUNT), AUTH handshake failure paths, replay attack detection, ACL denial cases.
- Files: `packages/shell/src/pseudo-relay.ts` lines 567-583, 122-130, 222-261, 131-220
- Risk: Regressions in core relay logic ship undetected. Protocol compliance violations.
- Priority: High — this is the heart of the napplet protocol.

**Storage proxy operations:**
- What's not tested: quota calculation edge cases, malformed tags in requests, concurrent set/get requests, storage persistence failures.
- Files: `packages/shell/src/storage-proxy.ts` lines 53-147
- Risk: Storage requests fail silently or corrupt data. Quota calculation is inconsistent across platforms.
- Priority: High — napps depend on storage working correctly.

**Shim relay subscription lifecycle:**
- What's not tested: subscribe/close ordering, message listener cleanup, EOSE delivery, subscription deduplication, scoped relay connection (NIP-29).
- Files: `packages/shim/src/relay-shim.ts` lines 50-115
- Risk: Memory leaks from dangling listeners. Duplicate event delivery. Subscription state corruption.
- Priority: Medium — most napplets use `subscribe()`.

**ACL grant/revoke/block operations:**
- What's not tested: capability sets after operations, persistence round-trip, block behavior, update behavior with auto-grant.
- Files: `packages/shell/src/acl-store.ts` lines 53-172
- Risk: Capability bits corrupted. Security model broken. Permissions bypass.
- Priority: High — this is security-critical.

**Keyboard hotkey forwarding:**
- What's not tested: hotkey tag parsing, key event reconstruction, dispatch to shell hotkeyExecutor.
- Files: `packages/shell/src/pseudo-relay.ts` lines 401-411
- Risk: Hotkeys not dispatched or dispatched with wrong modifiers. User experiences unresponsive shell.
- Priority: Medium — depends on shell UI implementation, but affects usability.

**Manifest cache persistence and update behavior:**
- What's not tested: cache load/persist round-trip, manifest update detection, version bump behavior, old manifest eviction.
- Files: `packages/shell/src/manifest-cache.ts` lines 19-59
- Risk: Manifest inconsistencies. Old builds not evicted. Updates not detected.
- Priority: Medium — impacts napplet versioning.

---

*Concerns audit: 2026-03-29*
