---
phase: 161-ad-hoc-convention-package-contracts
verified: 2026-07-23T17:54:43Z
status: passed
score: 12/12 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 11/12
  gaps_closed:
    - "Current HEAD 55183f38 is now pushed to origin and is the head of PR #186."
  gaps_remaining: []
  regressions: []
prohibitions_resolved:
  accepted_by: developer
  accepted_at: 2026-07-23T17:48:10Z
  authority: "Explicit developer instructions in this verification thread"
  resolution: "The developer accepts the adopted PR #89/#90/#91 interpretations: no extra protocol semantics; exact queryless INC routing after invocation-boundary transposition; PR #89 resolves web#183; preserved history and unrelated semantics; and guides/package references limited to the adopted boundary."
---

# Phase 161: Ad-hoc Convention Package Contracts Verification Report

**Phase Goal:** Align every active package, runtime binding, manifest producer, CLI reader, conformance fixture, document, example, skill, guard, and release artifact with adopted NAP-INC PR #89, web-projection PR #90, and NAP-INTENT PR #91.
**Verified:** 2026-07-23T17:54:43Z
**Status:** passed
**Re-verification:** Yes — publication gap closed

## Goal Achievement

This report treats the summaries and both review reports as non-evidence. The implementation is unchanged since the passed 11/11 audit at `0319dac8`; the live tree is now `55183f38`, which adds only the Plan 161-10 summary. The implementation was compared directly with the adopted draft heads: [NAP-INC #89](https://github.com/napplet/naps/blob/4593ce9e301ce098fd3dad64206fcd6f144fa7af/naps/NAP-INC.md), [web projection #90](https://github.com/napplet/naps/blob/896c32c92deee68dc4d10fc1132b62df20cccb6f/projections/web.md), and [NAP-INTENT #91](https://github.com/napplet/naps/blob/a718915ddefa2f03a0126579601f59d8bd86f7c4/naps/NAP-INTENT.md).

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Intent callers use an authoritative URI; normalized identity, `IntentContract` discovery, acceptance-only result, and no-ID `onDelivery` are public across core, NAP, SDK, and shim. | ✓ VERIFIED | [`intent.ts`](/Users/sandwich/Develop/napplet/packages/core/src/types/intent.ts) defines the normalized request, contract, result, and delivery shapes. [`service-api.ts`](/Users/sandwich/Develop/napplet/packages/core/src/types/global/service-api.ts:318), NAP intent exports, SDK `intent`, and runtime injection expose the same URI API and `onDelivery`. |
| 2 | The URI is authoritative; query text transposition is shallow, percent-decoded text with literal `+`, and conflicts/repeated names/fragments/query-plus-payload fail before emission. | ✓ VERIFIED | [`convention-uri.ts`](/Users/sandwich/Develop/napplet/packages/nap/src/convention-uri.ts) derives identity once; INC and intent call it before `postMessage`. The focused URI invocation test passes and conformance rejects malformed/conflicting normalized requests. |
| 3 | INC keeps exact complete queryless convention identity and endpoint-attested sender provenance. | ✓ VERIFIED | [`inc/shim.ts`](/Users/sandwich/Develop/napplet/packages/nap/src/inc/shim.ts) transposes only convention-URI emit input and dispatches with `incTopicHandlers.get(msg.topic)`. The reference shell derives `sender` from `handleFrom(endpoint, ...)`, while outbound `sender` is forbidden in the validator. |
| 4 | `ok: true` means accepted responsibility, not handling; acceptance precedes a separate, target-only delivery and URI conflicts are rejected. | ✓ VERIFIED | [`reference-shell.ts`](/Users/sandwich/Develop/napplet/packages/conformance/src/shell/reference-shell.ts) queues `intent.deliver` independently before returning an accepted result. The named endpoint-attested acceptance/delivery test and malformed/forged identity test pass. |
| 5 | Every pre-registration delivery is retained and drained exactly once in FIFO order, without public ID, INC coupling, or source-lifecycle dependency. | ✓ VERIFIED | [`intent/shim.ts`](/Users/sandwich/Develop/napplet/packages/nap/src/intent/shim.ts) retains deliveries until first registration and uses `splice(0)` for one FIFO drain. The focused FIFO state-transition test passes; the selected-domain shim test proves delivery works without INC. |
| 6 | Vite discovery emits one queryless contract per archetype tag, with optional same-tag `kind:<number>` fields, outside aggregate-hash folding and without payload-kind inference. | ✓ VERIFIED | [`manifest.ts`](/Users/sandwich/Develop/napplet/packages/vite-plugin/src/manifest.ts) validates queryless slug-matching identities and serializes `eventKinds` on the same tag. The named isolation/serialization test passes. |
| 7 | CLI object config and template metadata preserve optional per-contract event kinds without a delimiter or kinds flag. | ✓ VERIFIED | [`config.ts`](/Users/sandwich/Develop/napplet/packages/cli/src/config.ts) validates object-shaped `eventKinds`; [`manifest-metadata.ts`](/Users/sandwich/Develop/napplet/packages/cli/src/manifest-metadata.ts) preserves only canonical same-tag fields. The named Deno regression passes. |
| 8 | Conformance recognizes the adopted carriers, rejects forged sender/invalid normalized intent input, and its reference shell proves authenticated source attribution. | ✓ VERIFIED | [`envelope.ts`](/Users/sandwich/Develop/napplet/packages/conformance/src/validators/envelope.ts) forbids outbound sender fields and validates normalized intent requests; [`reference-shell.test.ts`](/Users/sandwich/Develop/napplet/packages/conformance/src/shell/reference-shell.test.ts) proves source snapshotting and separate delivery. |
| 9 | Active docs, examples, skills, and the guard teach the adopted split rather than retired lifecycle/metadata rules. | ✓ VERIFIED | 31 active documentation/skill files changed versus `origin/main`; `skills` is the canonical `packages/skills/skills` symlink. The live active-surface scanner passes its positive, negative, history, and false-positive fixtures. |
| 10 | Invented active `napplet-*` HTML manifest metadata is retired. | ✓ VERIFIED | Direct active-source scan found no use of `<meta name="napplet-*">`; the three remaining mentions are AGENTS policy, a conformance validator's negative policy statement, and a negative test. Vite writes protocol data only to signed manifest tags. |
| 11 | Release coverage and the required repository gates are present. | ✓ VERIFIED | The two phase changesets cover all ten packages changed versus `origin/main`; `pnpm changeset status` reports the expected bumps. `git diff --check origin/main...HEAD` passes. The user-provided just-passed full build/type/unit/conformance/docs/link/slop/audit/diff chain applies to this unchanged HEAD. |
| 12 | The final Plan 161-10 evidence summary is published with the reviewed PR state. | ✓ VERIFIED | `HEAD`, `origin/feat/ad-hoc-nap-schemes`, and open PR #186 all resolve to `55183f38`; the final summary is now published. |

**Score:** 12/12 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `packages/core/src/types/intent.ts` | Public adopted intent contract | ✓ VERIFIED | Substantive exported types; consumed by NAP and SDK barrels. |
| `packages/nap/src/convention-uri.ts` | Shared URI normalizer | ✓ VERIFIED | Used by both INC emission and intent invoke/open. |
| `packages/nap/src/intent/shim.ts` | Normalized invoke, no-ID FIFO delivery | ✓ VERIFIED | Runtime behavior exercised by the named FIFO test. |
| `packages/shim/src/runtime.ts` | Intent injection and parent-message routing | ✓ VERIFIED | `intent.` router and `onDelivery` are installed independently of INC. |
| `packages/vite-plugin/src/manifest.ts` | Queryless same-tag manifest contracts | ✓ VERIFIED | Real option-to-signed-manifest data flow, including `eventKinds`. |
| `packages/cli/src/{config.ts,manifest-metadata.ts}` | Object config and manifest preservation | ✓ VERIFIED | Real config-to-template tag data flow; named Deno test passes. |
| `packages/conformance/src/{validators/envelope.ts,shell/reference-shell.ts}` | Carrier validation and endpoint-attested fixture | ✓ VERIFIED | Validator and shell are wired through recorded conformance verdicts. |
| `scripts/test-convention-contracts.mjs` | Active-surface regression guard | ✓ VERIFIED | Invoked by `package.json` and passed against the live repository. |

The GSD artifact checker reports every declared artifact as substantive. Its false-negative key-link results for plans 01, 02, 03, 10, 13, 14, and 18 stem from stale/over-escaped plan patterns (for example `intent\\.invoke`, `get\\(msg\\.topic\\)`, or non-file source `git diff`), not an absent connection; each is manually traced above.

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| URI call boundary | normalized wire request | `normalizeConventionUri` | ✓ WIRED | Both `inc.emit` and `intent.invoke/open` normalize before `postToShell`. |
| Intent shim | core/NAP/SDK/shim public surfaces | matching `Intent*` types and facades | ✓ WIRED | Core types are re-exported from NAP and SDK; runtime installs the matching facade. |
| `intent.deliver` parent message | target listener | `intent.` router → `handleIntentMessage` → `onDelivery` | ✓ WIRED | Parent-source guard and selected-domain test prove the complete route. |
| Vite archetype option | signed NIP-5A tags | `buildArchetypeTags` | ✓ WIRED | Object `eventKinds` reaches same-tag `kind:<number>` fields. |
| CLI config/template | deployment manifest | `mergeConfigMetadataTags` | ✓ WIRED | Canonical template kinds are retained unless object config replaces archetypes. |
| Reference endpoint | delivered sender | `handleFrom` → queued delivery | ✓ WIRED | Sender snapshot is independent of caller data and later endpoint mutation. |
| `package.json` | active contract scanner | `test:convention-contracts` | ✓ WIRED | Executed successfully in this verification. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| Intent shim | normalized `IntentRequest` | URI/options via `normalizeConventionUri` | URI-derived identity and text map or opaque explicit payload | ✓ FLOWING |
| Intent delivery | `retainedDeliveries` / handlers | shell `intent.deliver` message from authenticated parent | Concrete delivery objects are queued then drained FIFO | ✓ FLOWING |
| Vite manifest | `archetypeTags` | configured `archetypes` | Signed manifest tags, not static placeholders | ✓ FLOWING |
| CLI manifest | `metadata.archetypes` | normalized config/template tags | Canonical same-tag event kinds | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Pre-registration delivery is FIFO and drains once | `pnpm --filter @napplet/nap exec vitest run src/intent/shim.test.ts -t 'retains early target deliveries and drains them once in FIFO order'` | 1 passed | ✓ PASS |
| Accepted intent is delivered later with endpoint-attested sender | `pnpm --filter @napplet/conformance exec vitest run src/shell/reference-shell.test.ts -t 'accepts a normalized invoke before delivering the endpoint-attested target payload'` | 1 passed | ✓ PASS |
| Invalid/conflicting/forged normalized requests fail validation | `pnpm --filter @napplet/conformance exec vitest run src/validators/envelope.test.ts -t 'rejects malformed or forged normalized intent identities'` | 1 passed | ✓ PASS |
| Vite retains same-tag kind isolation | `pnpm --filter @napplet/vite-plugin exec vitest run --config vitest.config.ts src/index.test.ts -t 'emits optional event kinds on the same tag and keeps contracts isolated'` | 1 passed | ✓ PASS |
| CLI preserves only canonical same-tag event kinds | `deno test --allow-read --allow-write --allow-run --allow-env packages/cli/tests/manifest_test.ts --filter 'template metadata preserves only canonical same-tag event kinds'` | 1 passed | ✓ PASS |
| Active contract guard | `pnpm test:convention-contracts` | 5 tests plus live scan passed | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — no phase-declared or conventional `scripts/**/tests/probe-*.sh` probe exists.

### Requirements Coverage

| Requirement | Source Plans | Status | Evidence |
| --- | --- | --- | --- |
| CONV-PKG-01 | 01, 07, 15–19 | ✓ SATISFIED | URI public API, canonical types, conflict rejection, target-only delivery, public exports, and runtime injection all trace through live code. |
| CONV-PKG-02 | 03, 20 | ✓ SATISFIED | Vite validates queryless object entries and emits optional same-tag kinds outside aggregate hashing. |
| CONV-PKG-03 | 04, 21 | ✓ SATISFIED | CLI validates/preserves object `eventKinds`; the convention-only flag/wizard input has no invented kinds syntax. |
| CONV-PKG-04 | 02, 13–15, 22 | ✓ SATISFIED | Exact INC routing, query transposition, literal-plus behavior, pre-send rejection, and endpoint sender derivation are implemented and tested. |
| CONV-PKG-05 | 05–09, 11–12, 22–26 | ✓ SATISFIED | Conformance, reference shell, active docs/skills, and the guard implement the adopted split; active HTML protocol metadata is retired. |
| CONV-PKG-06 | 06, 10, 26 | ✓ SATISFIED | Changed public packages have release metadata; changeset status, active guard, and diff check pass; the final summary is published in PR #186. |

No requirements mapped to Phase 161 are orphaned. There are no later milestone phases clearly and specifically covering an unmet Phase 161 contract, so no items were deferred.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `apps/docs/guide/build-note-drafts-napplet*.md` | textarea examples | HTML `placeholder` attribute | ℹ️ Info | Normal UI attribute, not an implementation placeholder. |
| `packages/conformance/src/shell/reference-shell.ts` | 34 | placeholder `.invalid` URL | ℹ️ Info | Deliberate canned non-resolving fixture value. |
| `packages/nap/src/intent/index.ts` | 78 | no-op registration handler | ℹ️ Info | Documented dispatch registration stub; actual shim/runtime handler is wired separately. |

No unreferenced `TBD`, `FIXME`, or `XXX` marker appears in an active phase-modified file. No implementation stub, hollow data flow, residual fixed-three-field guidance, legacy three-argument INC emit, or active invented HTML metadata was found.

### Developer Authority Resolution

The developer explicitly accepted all seven judgment-tier interpretations in this verification thread: the implementation is limited to the adopted PR #89/#90/#91 semantics; INC routing is exact and queryless after invocation-boundary transposition; PR #89 resolves the former web#183 ambiguity; history and unrelated semantics remain preserved; and guide/package language does not expand the transposition boundary. The re-verification found no contradiction: active guidance consistently states that matching remains exact and rejects wildcard, prefix, and query-aware routing, while the runtime implements only the adopted query-text transposition.

### Gaps Summary

No code, requirement, publication, or unresolved judgment gap blocks the Phase 161 goal. The publication re-check confirms that `HEAD`, `origin/feat/ad-hoc-nap-schemes`, and PR #186 now resolve to `55183f38`.

---

_Verified: 2026-07-23T17:54:43Z_
_Verifier: the agent (gsd-verifier)_
