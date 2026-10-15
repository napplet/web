# Quick Task 260904-nm7: Packaged Loader UX - Research

**Researched:** 2026-09-04
**Domain:** Generated single-file napplet resource loading, accessibility, and Paja production verification
**Confidence:** HIGH

## Summary

The packaged resource loader is private signed-artifact plumbing, so the requested UI needs no new protocol surface. The only protocol-facing behavior should remain the published `resource.bytes` / `resource.bytesMany` calls and `opts.signal` cancellation defined by NAP-RESOURCE; progress must be derived locally from complete, integrity-verified Blob results. NAP-RESOURCE defines no streaming, chunk, range, byte-progress, or percentage fields. For `bytesMany`, it also requires input-order/length preservation and independent per-URL processing: one failed row must not discard successful siblings. [CITED: https://github.com/napplet/naps/blob/fa6bcc6935aa19e7b70ab2a2c721dafca77c78e1/naps/NAP-RESOURCE.md#api-surface]

The current generated loader has no UI state machine or retry path. It lazily resolves resources, validates size and SHA-256, creates Response/object URLs, and releases verified bytes; the emitted loader has no timeout, although its TypeScript reference `ResourceRuntime` still has an internal 30-second default that must not be copied into the browser UX. [VERIFIED: packages/vite-plugin/src/optimizer/loader.ts:59-92,126-280]

**Primary recommendation:** inject one small inline loader screen plus an instrumented, cancellable in-flight registry; count unique resources only after integrity verification, preserve concurrent/batched retrieval, keep the original application promises pending across user-retryable failures, and let the current application continuation replace/reveal the app only after its requested startup cohort is complete. [RECOMMENDATION]

## Architectural Responsibility Map

| Capability | Primary tier | Secondary tier | Rationale |
|------------|--------------|----------------|-----------|
| Loader presentation and state | Browser / generated artifact | Vite build | The plugin emits the inline markup, CSS, and private runtime; Paja should not need app-specific UI. [VERIFIED: packages/vite-plugin/src/optimizer/pipeline.ts:218-257] |
| Resource retrieval and fetch deadline | Shell/runtime | Browser loader | The loader calls NAP-RESOURCE; runtime policy owns fetch, while the napplet may cancel with `opts.signal`. [CITED: https://github.com/napplet/naps/blob/fa6bcc6935aa19e7b70ab2a2c721dafca77c78e1/naps/NAP-RESOURCE.md] |
| Integrity and URL adaptation | Browser loader | Shell/runtime | The shell verifies Blossom content and the private loader rechecks signed-table length/SHA-256 before exposing Response/object URLs. [VERIFIED: packages/vite-plugin/src/optimizer/loader.ts:154-230] |
| Atomic application handoff | Application continuation | Loader view | The deployed wrapper waits on ten concurrent Responses, reconstructs HTML, then calls `document.open/write/close`; the loader must not reveal an intermediate document. [VERIFIED: https://cdn.hzrd149.com/cdcfc2666776a70805d7570e32dec08c94d1da49824b8e709dff438af684c9f0] |

## Standard Stack

| Component | Version / API | Use |
|-----------|---------------|-----|
| Browser platform | DOM, AbortController, Web Crypto, native progress/button semantics | Use directly inside emitted inline code; add no runtime package. [VERIFIED: packages/vite-plugin/src/optimizer/loader.ts; packages/vite-plugin/package.json] |
| TypeScript / Vitest | 5.9.3 / 4.1.2 declared | Source and deterministic state/runtime tests. [VERIFIED: packages/vite-plugin/package.json] |
| Playwright / Chromium | 1.61.0 / system Chromium available | Long-running Paja and screenshot/trace proof. [VERIFIED: local command probes] |
| Paja | kehto/web `origin/main` `872db9d0` | Production host containing merged no-timeout/cancellation correction. [VERIFIED: /home/sandwich/Develop/kehto git refs] [CITED: https://github.com/kehto/web/pull/263] |

## Current Implementation Map

1. `manifest.prepareDistIndexHtml()` renders the single-file build, runs optimization, commits only a verified transaction, then builds the manifest from the final bytes. This ordering protects bundling and aggregate-hash behavior. [VERIFIED: packages/vite-plugin/src/manifest.ts:73-123]
2. `pipeline.renderOptimizedHtml()` performs parser-scoped URL rewrites first, then `injectPrivateMetadata()` appends the JSON table and inline loader before `</head>`; the injected bytes are included in final size measurement. [VERIFIED: packages/vite-plugin/src/optimizer/pipeline.ts:218-257]
3. `loader.resolve()` uses `resource.bytes`; `resolveMany()` preserves result ordering but currently rejects a mixed `bytesMany` result before verifying/caching any successful sibling. That early-rejection defect conflicts with NAP-RESOURCE PR #80 head `fa6bcc6`, which requires each URL to behave independently and forbids one failed URL from discarding successful siblings. The revised loader must verify/cache every successful row independently, retain failed-source identities, keep the aggregate application-facing promise pending for retry, and reconstruct the eventual return array in original input order. [VERIFIED: packages/vite-plugin/src/optimizer/loader.ts:180-218] [CITED: https://github.com/napplet/naps/blob/fa6bcc6935aa19e7b70ab2a2c721dafca77c78e1/naps/NAP-RESOURCE.md#api-surface]
4. The emitted loader currently has a cache and object-URL registry but no in-flight deduplication, progress callbacks, AbortController, error UI, or retry. Its source contains no raw `fetch()` and no timeout. [VERIFIED: packages/vite-plugin/src/optimizer/loader.ts:278-280; packages/vite-plugin/src/optimizer/loader.test.ts:31-46]
5. Current coverage exercises canonical request objects, integrity, response/object-URL ownership, bounded batch/digest/cache behavior, a synthetic timeout, and fail-closed batch errors. It does not exercise visible initial/active/partial/success/cancel/retry/failure states. [VERIFIED: packages/vite-plugin/src/optimizer/loader.test.ts:31-130]
6. Reference rewriting is already parser/location scoped and must remain untouched: only a fully supported asynchronous fetch sentinel is externalized; HTML attributes, inline CSS, workers, module imports, WASM streaming, computed strings, and mixed-use assets remain ineligible. [VERIFIED: packages/vite-plugin/src/optimizer/references.ts:306-461; packages/vite-plugin/src/optimizer/references.test.ts]

The live reproduction is concrete: named manifest `large-single-file-test` resolves to index hash `cdcfc266…c9f0`, aggregate `bf5893d1…9281`, and ten 7.1-8 MiB resources totaling 82,953,403 bytes. The wrapper issues all ten `response()` calls inside one `Promise.all`, shows `<p>Loading packaged application…</p>`, and performs whole-document replacement only after all responses complete. [VERIFIED: `nak req -k 35129 -d large-single-file-test`; https://cdn.hzrd149.com/cdcfc2666776a70805d7570e32dec08c94d1da49824b8e709dff438af684c9f0]

## Protocol Gap Check

No protocol gap blocks this task. NAP-RESOURCE already supplies terminal complete Blobs, ordered bulk results, and explicit cancellation; the loader screen, resource-count reducer, retry loop, and DOM handoff are private artifact behavior. Adding progress envelopes or fields would be a protocol invention and is prohibited. [CITED: https://github.com/napplet/naps/blob/fa6bcc6935aa19e7b70ab2a2c721dafca77c78e1/naps/NAP-RESOURCE.md]

## Recommended State Machine and Runtime Pattern

| State | Entry condition | Required rendering and behavior |
|-------|-----------------|---------------------------------|
| Initial | Inline body markup parses before startup requests | Show “Preparing packaged application” immediately; no invented numeric value and no activity animation until a request is active. [RECOMMENDATION] |
| Active | At least one unique startup resource is in flight | Show an indeterminate semantic progress bar and “Loading resources N of T”; `N` is verified completions and `T` is the unique requested startup cohort, not bytes. [RECOMMENDATION] |
| Partial | One resource verifies while siblings remain active | Increment exactly once per source after length and SHA-256 pass; keep the activity bar indeterminate. [RECOMMENDATION] |
| Failure | A resource call, row, or integrity check fails | Verify/cache successful `bytesMany` siblings independently, retain every failed source identity, display fixed actionable copy plus a safely rendered failing source, expose a native Retry button, retry only failed/cancelled rows, keep the aggregate caller promise pending, and reconstruct final results in original input order after recovery. [CITED: https://github.com/napplet/naps/blob/fa6bcc6935aa19e7b70ab2a2c721dafca77c78e1/naps/NAP-RESOURCE.md#api-surface] [RECOMMENDATION] |
| Cancelled | The loader-owned controller aborts active single/batch calls | Show “Loading cancelled” and Retry; signal cancellation must flow through the existing namespace so it emits canonical `resource.cancel`, never a hand-built envelope. [CITED: https://github.com/napplet/naps/blob/fa6bcc6935aa19e7b70ab2a2c721dafca77c78e1/naps/NAP-RESOURCE.md] |
| Retry | Retry is activated by click, Enter, or Space | Create fresh AbortControllers only for failed/cancelled work, reuse verified cache entries, preserve source order, and leave the original application-facing promise pending so success resumes the existing app continuation. [RECOMMENDATION] |
| Success | No active/error state remains after every source in the initial requested cohort verifies | Announce “Resources ready. Opening application…” and remove the loader in one operation on the next animation frame; awaited application microtasks run first, while `document.open/write/close` wrappers replace the loader as part of the document handoff. [RECOMMENDATION] |

Do not proactively fetch every private-table entry merely to obtain a denominator: the optimizer cannot prove that every supported callsite is eager, and prefetching can change lazy behavior or exceed the existing 50 MiB live-Blob bound. Register sources as the application requests them, coalesce duplicate calls in an `inFlight: Map<source, Promise<Blob>>`, and close the initial cohort after one idle animation frame. `resolveMany()` should remain one ordered bulk request per existing group; validate the response length/order association, verify/cache each `ok: true` row independently, retain the source identity and typed error for every `ok: false` or locally failed-integrity row, retry only those failed/cancelled rows, and fill their original result slots before the aggregate caller promise resolves. Never split bulk work into serial `bytes()` calls merely to make progress appear smoother. [VERIFIED: packages/vite-plugin/src/optimizer/loader.ts:59-63,100-117,191-209] [CITED: https://github.com/napplet/naps/blob/fa6bcc6935aa19e7b70ab2a2c721dafca77c78e1/naps/NAP-RESOURCE.md#api-surface] [RECOMMENDATION]

Remove the reference runtime's default `DEFAULT_TIMEOUT_MS` / `withTimeout()` behavior, or make absence explicitly unbounded if the reference class remains. The emitted browser loader already waits without a local deadline, and merged Paja PR #263 proves resource correlation must remain open until a terminal envelope or explicit cancellation while ordinary namespace requests retain their deadline. [VERIFIED: packages/vite-plugin/src/optimizer/loader.ts:63,84-92,135-150,181-205] [CITED: https://github.com/kehto/web/pull/263]

## Inline UI Contract

- Emit a full-viewport, opaque loader root immediately after `<body>` and its `<style data-napplet-private-loader>` in `<head>`; retain the current loader script before deferred/module application execution. Inject these only when `entries.length > 0`, through the same final render path so byte measurement and aggregate hashing include them. [VERIFIED: packages/vite-plugin/src/optimizer/pipeline.ts:218-257] [RECOMMENDATION]
- Use system fonts only, a compact centered card, `color-scheme: light dark`, fluid spacing, and `@media (prefers-color-scheme: dark)`. Suggested palette: light canvas/panel/text/accent `#f5f7f2/#ffffff/#16211c/#2f6f58`; dark `#0f1412/#171d1a/#f1f5f2/#70d6aa`; error `#b42318` light and `#ff8b82` dark. Tested text pairs range from 5.94:1 to 16.56:1 in light and 7.55:1 to 15.55:1 in dark, above WCAG AA normal-text minimum. [VERIFIED: local WCAG luminance calculation] [CITED: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html]
- Avoid logos, illustrations, gradients, remote fonts, external assets, blur-heavy effects, and celebratory motion. Use one restrained border, one accent, tabular resource counts, and a low-amplitude horizontal activity sweep appropriate for a transient system surface. [RECOMMENDATION]
- Use a labeled `<progress>` without a `value` while work is active, a persistent `<p role="status" aria-live="polite" aria-atomic="true">` containing the whole contextual update, and `aria-busy` on the loader region. An omitted progress value is the platform's indeterminate state. [CITED: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/progress] [CITED: https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html]
- Disable the sweep under `@media (prefers-reduced-motion: reduce)` and leave a static high-contrast bar segment so activity is not communicated by motion alone. [CITED: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion]
- Use native `<button type="button">` controls with a visible `:focus-visible` ring. Put only sanitized display text into `textContent`: derive a display label from `entry.source`, replace C0/C1 control characters, preserve the original source solely as a Map key, and use `dir="auto"` plus `overflow-wrap:anywhere`. Never interpolate resource names or runtime error messages into HTML. [RECOMMENDATION]

## Files and Validation Architecture

| File | Planned responsibility |
|------|------------------------|
| `packages/vite-plugin/src/optimizer/loader.ts` | Add in-flight state, state notifications, AbortSignal wiring, safe retry/cancel, source-specific failures, and remove the reference-only absolute timeout. [RECOMMENDATION] |
| `packages/vite-plugin/src/optimizer/loader-screen.ts` (new) | Keep self-contained markup/CSS and the small view projection out of the already 281-line loader module; no dependency. [RECOMMENDATION] |
| `packages/vite-plugin/src/optimizer/pipeline.ts` | Inject style/runtime in `<head>` and loader markup immediately after `<body>` without changing rewrite, transaction, or hash ordering. [RECOMMENDATION] |
| `packages/vite-plugin/src/optimizer/loader.test.ts` | Deferred-promise tests for initial, active, partial, success, failure, cancel, keyboard retry, no-timeout, safe-name rendering, mixed-row successful-sibling retention, failed-only retry, original-order reconstruction, and concurrency. [RECOMMENDATION] |
| `packages/vite-plugin/src/optimizer/pipeline.test.ts` | Assert self-contained injection, no UI for zero committed entries, output measurement, final manifest/integrity ordering, and absence of CSP/sandbox/raw-fetch changes. [RECOMMENDATION] |
| `packages/vite-plugin/src/optimizer/large-fixture-runtime.ts` and `.test.ts` | Execute the emitted loader with staggered deferred results; assert multiple requests are already outstanding before the first resolves and record ordered state transitions. [RECOMMENDATION] |
| `scripts/validate-packaged-loader-evidence.mjs` and `.test.mjs` | Retained deterministic evidence validator: validate schema/event order and elapsed time from timestamps, every session/state, PNG signature/dimensions/SHA-256, Playwright ZIP structure/SHA-256, public naddr resolution, deployed index/resource byte hashes and aggregate identity, cross-file evidence hashes, and absence of secret material. [RECOMMENDATION] |
| `.changeset/<new-name>.md` | Patch `@napplet/vite-plugin` only. Existing PR #205 already carries the feature minor, but this separately records the shipped loader UX; no CLI/build-tools output changes are required. [VERIFIED: .changeset/tidy-blossom-assets.md; .changeset/fix-pinned-fetch-and-scoped-render.md] |

Targeted command:

```bash
pnpm --dir packages/vite-plugin exec vitest run --config vitest.config.ts src/optimizer/loader.test.ts src/optimizer/pipeline.test.ts src/optimizer/references.test.ts src/optimizer/large-fixture-runtime.test.ts src/optimizer/large-fixture.test.ts
node --test scripts/validate-packaged-loader-evidence.test.mjs
```

Full gate:

```bash
pnpm build
pnpm type-check
pnpm -r test:unit
pnpm lint
pnpm test
pnpm audit --audit-level high
pnpm dlx aislop@0.12.0 scan --changes --base origin/feat/vite-plugin-blossom-optimization .
git diff --check origin/feat/vite-plugin-blossom-optimization...HEAD
```

The current environment has Node 22.23.1, pnpm 10.8.0, Chromium, and Playwright 1.61.0; the vite-plugin declares TypeScript 5.9.3 and Vitest 4.1.2. [VERIFIED: local command probes; package.json; packages/vite-plugin/package.json]

## Security Domain

| Area | Applies | Control |
|------|---------|---------|
| Authentication/session | No new surface | The UI neither authenticates nor persists state; Paja/runtime identity and grants remain unchanged. [VERIFIED: planned boundary and packages/vite-plugin/src/optimizer/loader.ts] |
| Access control | Yes, unchanged | Resource access stays exclusively behind injected `window.napplet.resource`; never add browser fetch or a manual postMessage path. [CITED: https://github.com/napplet/naps/blob/fa6bcc6935aa19e7b70ab2a2c721dafca77c78e1/naps/NAP-RESOURCE.md] |
| Input/output encoding | Yes | Validate table entries as today, keep source identity separate from its display label, and update DOM through `textContent` to prevent injected markup. [VERIFIED: packages/vite-plugin/src/optimizer/loader.ts:154-170] [RECOMMENDATION] |
| Cryptography | Yes, unchanged | Continue browser Web Crypto SHA-256 and exact byte-length checks; do not hand-roll or weaken integrity. [VERIFIED: packages/vite-plugin/src/optimizer/loader.ts:77-81,166-170,278-280] |
| Availability | Yes | No napplet-side absolute deadline; bound memory/concurrency, offer explicit AbortSignal cancellation, and clean controllers/listeners/Blob URLs on teardown. [CITED: https://github.com/kehto/web/pull/263] [RECOMMENDATION] |

## Paja Production Proof

The patched production host is available at `https://kehto.github.io/web/paja/`; kehto/web PR #263 is squash-merged as current `origin/main` `872db9d0`, and the sibling checkout can build/serve the same static route with `pnpm paja` at `/web/paja/`. [VERIFIED: `git -C /home/sandwich/Develop/kehto rev-parse origin/main`; /home/sandwich/Develop/kehto/package.json] [CITED: https://github.com/kehto/web/pull/263]

The existing baseline pointer is:

```text
naddr1qqtxcctjvajj6umfdenkcefdve5kcefdw3jhxaqpp4mhxue69uhkummn9ekx7mqzyqd3uql29gygy2k5gjcn9qkfnyklf6nngsflje7xfqulzzasxg8s5qcyqqqgjwgzt24sr
```

It is suitable for reproducing the old bare placeholder, but the final proof must deploy a freshly built branch artifact under a new ephemeral d-tag so the test exercises the new signed bytes without overwriting historical evidence. Run `napplet init --force --source-dir dist --name packaged-loader-ux-260904 ...`, then `napplet deploy --dry-run --name packaged-loader-ux-260904 --prompt-sec` and the matching non-dry deploy from that isolated fixture directory; never run these commands against or read the unrelated `packages/cli/.napplet/config.json`. [VERIFIED: packages/cli/README.md] [RECOMMENDATION]

Use Playwright against `https://kehto.github.io/web/paja/?naddr=<new-pointer>`. Before navigation, route only the known resource-hash URLs from the new private table and delay them asynchronously in staggered groups (for example 5 s, 20 s, and 40 s) before `route.continue()`. This preserves the real remote bytes and SHA-256 while proving the page event loop and CSS animation remain responsive beyond 30 seconds; Playwright officially supports browser-context/page request routing and continuing the original request. [CITED: https://playwright.dev/docs/network]

Before production styling, create ten deterministic temporary reference PNGs and retain their one-to-one comparison names for the visual gate: `reference-01-initial.png -> 01-initial.png`, `reference-02-active-35s.png -> 02-active-35s.png`, `reference-03-partial.png -> 03-partial.png`, `reference-04-error.png -> 04-error.png`, `reference-05-ready.png -> 05-ready.png`, `reference-06-cancelled.png -> 06-cancelled.png`, `reference-07-light.png -> 07-light.png`, `reference-08-dark.png -> 08-dark.png`, `reference-09-reduced-motion.png -> 09-reduced-motion.png`, and `reference-10-keyboard-retry.png -> 10-keyboard-retry.png`. Every mapped comparison must independently produce score >=90, `verdict: "pass"`, and `category_match: true`; persist score, verdict, category match, reasoning, differences, suggestions, and next actions before any next visual edit. Temporary references are not release artifacts and stay outside the repository. [RECOMMENDATION]

Capture production artifacts under the quick-task evidence directory:

- `01-initial.png` within the first rendered second, showing styled inline UI before any packaged resource is available. [RECOMMENDATION]
- `02-active-35s.png` after the former deadline, showing the activity bar still moving and no error/frozen placeholder. [RECOMMENDATION]
- `03-partial.png` showing a real intermediate count such as `3 of 10`. [RECOMMENDATION]
- `04-error.png` after aborting one routed resource once, including its safe source label and focused/keyboard-operable Retry. [RECOMMENDATION]
- `05-ready.png` showing the reconstructed application after Retry and all exact bytes resolve. [RECOMMENDATION]
- `paja-loader-timeline.json` with request start/terminal timestamps, loader state/count transitions, `resource.cancel` observation, retry attempt, final app marker, console/page errors, and exact manifest/index/aggregate hashes; also retain a Playwright trace. [RECOMMENDATION] [CITED: https://playwright.dev/docs/trace-viewer]

The evidence is accepted only through `node scripts/validate-packaged-loader-evidence.mjs <evidence-directory>`. The validator must fail closed on unknown/missing fields or invalid event order; derive the >35-second active interval from recorded timestamps rather than trusting a boolean; require all four named sessions and all ten required states; parse each PNG signature/IHDR for non-zero dimensions and compare its SHA-256 with the timeline; parse the trace ZIP central directory/end record, require Playwright trace entries, and compare its SHA-256; decode the public naddr, query its relays for the signed matching manifest, fetch the deployed index and recorded resource endpoints, recompute every byte length/SHA-256 plus the canonical NIP-5A aggregate (`<sha256> <absolute-path>\n`, lexicographically sorted, UTF-8 SHA-256), and cross-check every recorded identity. It must scan the retained timeline, screenshots, trace entry names/text metadata, review/verification artifacts, committed diff, and PR body for the ephemeral secret and common secret encodings while never accepting or printing the secret itself. Unit tests must cover valid evidence plus corrupted ordering/timing, PNG, ZIP, naddr/manifest/index/resource/aggregate/hash associations, missing states/sessions, and secret canaries. [CITED: https://github.com/nostr-protocol/nips/blob/master/5A.md#aggregate-hash] [RECOMMENDATION]

Existing baseline screenshots at `/home/sandwich/Downloads/Screenshot 2026-09-04 at 14-55-01 @kehto_paja.png` and `...14-54-51...` show the bare placeholder and ten terminal resource results; PR #263 records a real 113,382 ms completion with zero page errors. [VERIFIED: local screenshot inspection] [CITED: https://github.com/kehto/web/pull/263]

## Common Pitfalls and Security Boundaries

- **Invented progress:** never show bytes, percentages, transfer rate, ETA, or chunk language. Only count terminal, locally verified resources. [CITED: https://github.com/napplet/naps/blob/fa6bcc6935aa19e7b70ab2a2c721dafca77c78e1/naps/NAP-RESOURCE.md]
- **UI-driven serialization:** do not replace existing parallel calls or ordered `bytesMany` batches with an `await` loop. Control completion order with deferred test Promises instead. [VERIFIED: deployed artifact and packages/vite-plugin/src/optimizer/loader.ts:191-209]
- **Meaningless retry or discarded siblings:** if the first application promise has already rejected, retrying only the cache cannot resume startup; if one failed bulk row discards successful siblings, the loader violates NAP-RESOURCE and repeats expensive work. Keep the aggregate private promise pending, verify/cache successful rows independently, retry only failed/cancelled sources, and rebuild the final array in original order. [CITED: https://github.com/napplet/naps/blob/fa6bcc6935aa19e7b70ab2a2c721dafca77c78e1/naps/NAP-RESOURCE.md#api-surface] [RECOMMENDATION]
- **Unsafe diagnostics:** signed metadata is still untrusted display input. Use fixed error copy and `textContent`; do not expose raw stack/error messages, URIs, server hints, or HTML. [RECOMMENDATION]
- **Policy drift:** do not add a CSP meta tag, sandbox token, network fallback, new manifest tag, message type, or hard timeout. NIP-5D keeps verified `srcdoc`, `sandbox="allow-scripts"`, runtime injection, and single `/index.html` as canonical; shell-injected CSP remains outside signed bytes. [CITED: https://github.com/nostr-protocol/nips/blob/24711d9c47bbdd07908bf1d52bf677d9cbc530f0/5D.md]
- **Transaction drift:** inject UI before final manifest hashing and retain rollback/no-op behavior so failed optimization emits neither loader UI nor a dangling `requires:resource`. [VERIFIED: packages/vite-plugin/src/manifest.ts:73-166; packages/vite-plugin/src/optimizer/pipeline.ts:368-428]

## Project Constraints (from AGENTS.md)

- Canonical living NIP-5D, NIP-5A, and NAP documents override repository code/tests; no protocol surface or loading/security model may be invented, and every normative decision needs a canonical citation. [VERIFIED: AGENTS.md]
- Keep ESM-only, framework-free output; add no dependency; preserve inline single-file behavior and public API JSDoc rules. [VERIFIED: AGENTS.md]
- Update tests and a package changeset with shipped output, run build/type-check/unit/lint/static quality gates, keep diffs small, and leave unrelated work untouched. [VERIFIED: AGENTS.md]
- Preserve the untracked `packages/cli/.napplet/config.json`; do not open, stage, stash, edit, or delete it. [VERIFIED: task assignment and git status]

## Open Questions (RESOLVED)

1. **Fresh production pointer authority — resolved:** the user's explicit real-production Paja requirement authorizes exactly one fresh ephemeral named-manifest deployment for this proof. Generate the signing key locally, keep it only in process memory or an anonymous/mode-0600 temporary file, never print or persist it in repository/evidence/history, publish under a unique `packaged-loader-ux-<suffix>` d-tag that cannot overwrite a historical tag, and destroy the key after the retained validator passes. No additional confirmation gate is required. [DECISION]

## Assumptions Log

All implementation claims above were verified from the current branch, exact deployed artifact, exact canonical proposal heads, or official accessibility/browser documentation. No `[ASSUMED]` claims are used.

## Sources

- [NAP-RESOURCE PR #80 at `fa6bcc6`](https://github.com/napplet/naps/blob/fa6bcc6935aa19e7b70ab2a2c721dafca77c78e1/naps/NAP-RESOURCE.md) - terminal Blob results, ordered independent bulk rows whose successful siblings survive failures, AbortSignal cancellation, runtime policy, and absence of progress fields.
- [NIP-5D PR #2303 at `24711d9`](https://github.com/nostr-protocol/nips/blob/24711d9c47bbdd07908bf1d52bf677d9cbc530f0/5D.md) - verified `srcdoc`, sandbox, injected namespace, manifest, CSP boundary, and single-file artifact.
- [kehto/web PR #263](https://github.com/kehto/web/pull/263) - no namespace timeout for resource transfers, canonical cancellation, and 113,382 ms Paja proof.
- [Deployed packaged artifact](https://cdn.hzrd149.com/cdcfc2666776a70805d7570e32dec08c94d1da49824b8e709dff438af684c9f0) - exact wrapper, resource table, parallel calls, placeholder, and document replacement.
- [HTML progress element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/progress), [WCAG status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), [WCAG contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), and [reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) - loader accessibility contract.
- [Playwright network routing](https://playwright.dev/docs/network) and [trace viewer](https://playwright.dev/docs/trace-viewer) - deterministic long-wait and evidence capture.

**Confidence breakdown:** stack HIGH; current architecture HIGH; protocol boundary HIGH; Paja proof path HIGH; UI recommendation HIGH; fresh production publication MEDIUM because live relay/Blossom availability remains an execution-time variable, with deployment authority resolved above.
