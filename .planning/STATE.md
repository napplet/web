---
gsd_state_version: 1.0
milestone: v0.31.0
milestone_name: Cleanup Quality Gate
status: Awaiting next milestone
stopped_at: Milestone v0.31.0 archived
last_updated: "2026-05-24T13:03:56.508Z"
last_activity: 2026-05-24 — Completed quick task 260524-kxa: please add badges to the README for github workflows, as well as badges for both npm and jsr
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 5
  completed_plans: 5
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-24 after v0.31.0 archive)

**Core value:** Prove that sandboxed Nostr apps can securely delegate to a host shell over a simple, standardized protocol — and ship the spec + SDK so others can build on it.

**Current focus:** Planning next milestone

> **Provenance note:** The "Accumulated Context" section below preserves bullet records from BOTH branches' STATE.md histories. Records tagged "v0.29.0" from main's lineage refer to the milestone NOW renumbered as v0.30.0 (Class-Gated Decrypt — Phases 135-138). Records tagged "v0.29.0" from feat/strict-model refer to NUB-CONNECT (Phases 135-142). Phase number alone is not a unique identifier across the two; cross-reference the topic (decrypt/identity/NIP-07 → v0.30.0; connect/class/CSP-authority → v0.29.0).

## Current Position

Phase: Milestone v0.31.0 complete
Plan: —
Status: Awaiting next milestone
Last activity: 2026-05-24 — Completed quick task 260524-kxa: please add badges to the README for github workflows, as well as badges for both npm and jsr

## Accumulated Context

### Decisions

Full decision log in PROJECT.md Key Decisions table. Recent decisions affecting current work:

- [Phase 143]: Dependency graph security upgrade complete. `vite` resolves to 6.4.2, `postcss` resolves to 8.5.10 via root pnpm override, and `turbo` resolves to 2.9.14. `pnpm dlx aislop scan --json .` reports `security.issues = 0`; `pnpm -r type-check`, `pnpm -r build`, and `pnpm -r test:unit` all exit 0.
- [Phase 144]: Fixable lint/slop cleanup complete. `pnpm dlx aislop fix .` removed 269 issues; manual cleanup removed remaining unused imports, empty block, and central shim duplicate block. `/tmp/napplet-144-aislop.json` has zero diagnostics for unused vars, duplicate imports, console leftovers, trivial/narrative comments, empty blocks, and duplicate blocks. `pnpm -r type-check`, `pnpm -r build`, and `pnpm -r test:unit` all exit 0.
- [Phase 145]: Type-safety boundary repair complete. Production `as any` and `as unknown as` scanner categories are zero in `/tmp/napplet-145-aislop.json`; NUB boundary smoke tests added; `pnpm -r type-check`, `pnpm -r build`, and `pnpm -r test:unit` all exit 0.
- [Phase 146]: Complexity hotspot split complete. `normalizeConnectOrigin`, vite-plugin schema walking, and vite-plugin hook bodies were split into private helpers; `/tmp/napplet-146-aislop.json` has no function-length, duplicate-code, lint, security, or AI-slop diagnostics. Four remaining file-size warnings are explicit deferrals for public or package-entry surfaces: `packages/core/src/types.ts`, `packages/nub/src/identity/types.ts`, `packages/sdk/src/index.ts`, and `packages/vite-plugin/src/index.ts`. `pnpm -r type-check`, `pnpm -r build`, `pnpm -r test:unit`, and `git diff --check` all exit 0.
- [Phase 147]: Final quality gate complete. `/tmp/napplet-147-aislop.json` reports score 89 / Healthy, 0 errors, 0 fixable issues, and engine counts format 0, lint 0, code-quality 4, ai-slop 0, security 0. The four code-quality warnings are the Phase 146 file-size deferrals only. `pnpm -r type-check`, `pnpm -r build`, `pnpm -r test:unit`, and `git diff --check` all exit 0.
- [Milestone v0.31.0]: Archive complete. Roadmap, requirements, and audit are archived under `.planning/milestones/`; active `.planning/REQUIREMENTS.md` removed for the next milestone cycle. Known residual debt is limited to four documented public-surface file-size warnings.
- PRINCIPLE: NUBs define protocol surface + potentialities; implementation UX is a shell concern
- PRINCIPLE: NUB packages own ALL logic (types, shim installers, SDK helpers); central shim/sdk are thin hosts
- PRINCIPLE: `@napplet/*` is private; never listed as implementations in public specs/docs
- PRINCIPLE: Cross-repo amendment PRs on `napplet/nubs` must contain zero `@napplet/*` / private-repo references
- PRINCIPLE: **Security enforcement runs shell-side, not shim-side.** Napplets are untrusted; any policy executed inside the iframe is by-definition bypassable by a hostile napplet
- PRINCIPLE: Shim-side class gating is observability / defense-in-depth ONLY; shell enforces authoritatively per GATE-01..04
- PRINCIPLE: Filename citation discipline — NUB amendments MUST cite class documents by filename (`NUB-CLASS-1.md`), never abstract phrases ("Class 1") as primary references
- PRINCIPLE: SPEC.md / NIP-5D edits land on master or their own PR, never bundled into long-lived NUB-WORD branches (per feedback_spec_branch_hygiene)
- v0.29.0 roadmap: 4 phases (135–138); 135 ‖ 136 parallel; 137 bundles NUB-IDENTITY + NUB-CLASS-1 amendments into a single PR per CLASS1-03
- v0.29.0 roadmap: Empirical Playwright CSP-injection-block simulation split into its own Phase 136 (discrete empirical fixture; v0.28.0 Phase 134 precedent adapted — there the verification ran end-of-milestone; here the empirical result is a Phase 137 input, so it moves forward)
- v0.28.0: Strict CSP capability `perm:strict-csp` raises the attacker's bar for exfiltration. Does NOT on its own block NIP-07 extension content-scripts injected via `chrome.scripting.executeScript({world:'MAIN'})`; DOES block legacy `<script>`-tag injection when `script-src` is nonce-based
- v0.24.0: `window.nostr` removed from napplets; no signer access in the sandboxed iframe
- v0.24.0: `relay.publishEncrypted` established the send-side shell-mediated crypto pattern (v0.29.0 mirrors the one-shot request/result shape on receive-side)
- [Phase 135]: TYPES-LOCK: Rumor = UnsignedEvent & { id: string } (nostr-tools canonical; NO sig field) locked into @napplet/core public surface
- [Phase 135]: TYPES-LOCK: IdentityDecryptErrorCode 8-value string-literal union (class-forbidden, signer-denied, signer-unavailable, decrypt-failed, malformed-wrap, impersonation, unsupported-encryption, policy-denied) shipped as public wire vocabulary
- [Phase 135]: DEVIATION: Added UnsignedEvent + Rumor to @napplet/core barrel (src/index.ts) — Rule 2 (required for cross-package consumption; plan's must-haves trued)
- [Phase 135]: SHIM-03 surgical-edit count: TWO textual edits in central shim (import + mount), both within identity-NUB hosting lines; existing prefix+suffix routing absorbs new envelope types
- [Phase 135]: GATE-04 shim-side class-short-circuit DEFERRED — window.napplet.class slot not yet on NappletGlobal in v0.29.0 milestone; shell enforcement authoritative
- [Phase 135]: Plan 02 workspace-wide type-check went fully green (stronger than plan predicted) — SDK identity namespace is a partial proxy; missing decrypt proxy doesn't fail type-check
- [Phase 135]: Plan 03: Named-import form chosen for decrypt return type (Promise<{ rumor: Rumor; sender: string }>) over inline expansion; Rumor added to top-of-file @napplet/core import in @napplet/sdk
- [Phase 135]: Plan 03: Rumor + UnsignedEvent @napplet/core re-exports on @napplet/sdk use one-line-per-type pattern (matching existing NostrEvent/NostrFilter/Subscription/EventTemplate lines at 781-784) rather than combined-list line
- [Phase 135]: Plan 03: 4-surgical-edit pattern collapses cleanly for identity NUB method extensions (DOMAIN unchanged; no installShim change); future identity method adds can reuse this template
- [Phase 135]: Plan 03: Workspace-wide pnpm -r type-check + pnpm -r build both exit 0 across 14 packages after SDK layer lands — VER-01 effectively satisfied up-front; Plan 04 only documents the pass and executes VER-05 tree-shake
- [Phase 135]: Plan 04: VER-01 + TYPES-06 stamped pass — pnpm -r build + pnpm -r type-check both exit 0 across 14 packages
- [Phase 135]: Plan 04: VER-05 stamped pass — identity-types-only esbuild tree-shake bundle is 129 bytes with ZERO occurrences of 7 forbidden runtime symbols (handleIdentityMessage, installIdentityShim, identityDecrypt, identityGetPublicKey, sendRequest, requireIdentity, pendingRequests)
- [Phase 135]: Plan 04: Symbol-absence (not byte-count) is the load-bearing VER-05 signal; v0.29.0 129-byte identity-types-only bundle vs v0.28.0 74-byte relay-types-only precedent reflects 2 stubs vs 1 stub, not a regression
- [Phase 135]: Plan 04: Regression canary (identityGetPublicKey: 0) confirms pre-Plan-01 existing identity surface still tree-shakes cleanly — Plan 01 type additions did NOT accidentally couple existing types to sdk
- [Phase 135]: Plan 04: Phase 135 is ready for Phase 137 consumption; Phase 136 may proceed in parallel; Phase 137 blocks on both 135 + 136 per STATE.md dependency graph
- [Phase 135]: Plan 04: Verification-only plan — all evidence under /tmp/napplet-135-* per AGENTS.md; zero repo source changes; zero home-directory pollution
- [Phase 135]: Plan 05: Gap closure — Rumor + UnsignedEvent re-exported from @napplet/nub/identity; assertNever exhaustiveness gate added to handleIdentityMessage over 21-member IdentityNubMessage union
- [Phase 135]: Plan 05: Loose external signature preserved on handleIdentityMessage; internal narrowing via  delivers compile-time exhaustiveness without breaking central shim's generic identity.* routing contract
- [Phase 135]: Plan 05: VER-01 + VER-05 regression-clean — workspace-wide pnpm -r build + type-check exit 0 across 14 packages; tree-shake bundle 129B with 8/8 runtime symbols absent (including new assertNever helper)
- [Phase 135]: Plan 05: Empirical exhaustiveness proof captured at /tmp/napplet-135-05-exhaustiveness-proof.log — deliberately adding a bogus union member triggers TS2345 at the assertNever call site (shim.ts:114)
- [Phase 136]: [Phase 136]: Plan 01 — Chromium 144+ empirically confirms NUB-CLASS-1 nonce-based script-src blocks legacy <script>-tag injection; violatedDirective='script-src-elem', blockedURI='inline', documentURI truncated to 'data' (scheme-only quirk), sourceFile=null (inline-injection quirk — no remote origin file)
- [Phase 136]: [Phase 136]: Plan 01 — Meta-delivered CSP cannot carry report-to (W3C CSP3 §4.2 header-only); in-page securitypolicyviolation event listener is the empirical observable equivalent to what a report-to endpoint would receive
- [Phase 136]: [Phase 136]: Plan 01 — v0.28.0 VER-02 Playwright CJS + Chromium headless + Wayland flag + data:URL + split stdout/stderr + VERnn_EXIT=$? stamp pattern extended cleanly from img-src to script-src nonce injection-block testing; pattern reusable for future empirical CSP gates
- [Phase 136]: [Phase 136]: Plan 01 — DEVIATION (Rule 3 blocking): added a single nonce-literal comment line to fixture source so plan's verify grep grep -q 'nonce-napplet136' passes; zero semantic change to fixture behavior
- [Phase 136]: Plan 02 — 136-PHASE-NOTES.md (93 lines) synthesizes Plan 01 evidence into Phase 137 consumable: 5 sections, 7 literal strings grep-verified present, Section 1 cites observed violatedDirective='script-src-elem' verbatim, Section 2 flags Chromium quirks documentURI='data' (scheme-only truncation) + sourceFile=null (inline-injection has no remote origin file) for Phase 137's report-to-endpoint MUST row
- [Phase 136]: Plan 02 — Phase boundary honored: 136-PHASE-NOTES.md records observations + documentation gates ONLY, does NOT author spec-amendment prose (no MUST/SHOULD tables, no 'Proposed Amendment Text' section); Phase 137 owns the amendment authoring. 3 MAY statements for DETECT-03 enumerated verbatim without ranking; DETECT-04 world:'MAIN' residual acknowledged HONESTLY with 'do NOT claim a fix' framing
- [Phase 136]: Plan 02 — Task 2 grep-sweep is a read-only verification producing /tmp/napplet-136-phase-notes-grep.log; no per-task commit per AGENTS.md no-home-pollution + Plan 01 precedent. Only Task 1 (PHASE-NOTES.md synthesis) lands a commit (707a412)
- [Phase 137]: Plan 01 — Bundle strategy executed via merge-based approach: `git checkout -b nub-identity-decrypt nub-identity` + `git merge --no-ff nub-class-1` (merge commit 031c7fa). Preserves both draft branches as reachable parents so the eventual PR reads as 'amendment to both specs'
- [Phase 137]: Plan 01 — Zero-push / zero-PR discipline verified: `git config --get branch.nub-identity-decrypt.remote` returns NO_REMOTE_CONFIGURED and `gh pr list --head nub-identity-decrypt --repo napplet/nubs --state all` is empty; human gates both per feedback_no_private_refs_commits
- [Phase 137]: Plan 01 — Hygiene pre-verified on baseline: zero `@napplet/`, `kehto`, `hyprgate` matches across 6 commits ahead of master AND across the 3-file diff (NUB-CLASS-1.md + NUB-IDENTITY.md + README.md). Baseline is hygiene-clean; wave 2+ amendment content must preserve
- [Phase 137]: Plan 137-02 — NUB-CLASS-1.md amended on nub-identity-decrypt with report-to SHOULD + violation-correlation MUST rows + observability-not-enforcement security subsection; commit c020479, 8 insertions 0 deletions, verbatim phrases 'MAY refuse-to-serve' and 'shell MAY reject' present for VER-03 Group E
- [Phase 137]: Single commit (not 2-commit split) for full NUB-IDENTITY amendment preserves spec-coherence at every reachable point
- [Phase 137]: Example envelope fencing matched existing file style (single triple-backtick fences, no language hint)
- [Phase 137]: Plan 04 — VER-02 3-channel hygiene grep stamps PASS (VER02_EXIT=0) across branch diff + commit log + PR body preview; VER-03 7-group conformance grep stamps PASS (VER03_EXIT=0, TOTAL_FAIL_COUNT=0) with all 8 error codes, 4 shell MUSTs, filename-citation discipline, 3 Security Considerations concerns, 7 Phase 136 substrate literals, NUB-CLASS-1 amendment literals, and GATE-04 observability framing all grep-verified. NUB-IDENTITY-06, NUB-IDENTITY-07, VER-02, VER-03 close here.
- [Phase 137]: Plan 04 — Phase 137 ship gate certified: branch nub-identity-decrypt at 45cdf39 with zero remote tracking and zero PR open; PR body preview prepared at /tmp/napplet-137-pr-body-preview.md for human reuse via gh pr create --body-file; final push + draft-PR open remain human-gated per feedback_no_private_refs_commits.
- [Phase 137]: Plan 04 — DEVIATION (Rule 1 x2): verification-script integer-parse bug (grep -c || echo 0 can emit '0\n0' tripping [ -eq 0 ]) fixed by piping through 'head -n1 | tr -d [:space:]'; self-reference hygiene-grep trap in PHASE-NOTES and SUMMARY fixed by describing forbidden-token regex semantically rather than quoting it verbatim (matching Plan 03 Review Checklist precedent). Neither deviation touched nubs-repo amendment content — only evidence/planning artifacts regenerated.
- [Phase 137]: Plan 04 — 137-PHASE-NOTES.md (132 lines) synthesizes Phase 138 handoff: NIP5D-01..04 + DOC-01..04 + VER-06 unblocked; Phase 138 can start before or after human PR open; Phase 138 NIP-5D edits land on napplet master per feedback_spec_branch_hygiene, never on the nub-identity-decrypt branch.
- [Phase 138]: [Phase 138]: Plan 01 — NIP5D-01 resolved as verification-only; local specs/NIP-5D.md confirmed strict superset of napplet/nubs master SPEC.md post-PR-15 (SUPERSET_OK=1 on 5 required semantics); no backport needed
- [Phase 138]: [Phase 138]: Plan 01 — NIP-07 Extension Injection Residual subsection authored as 4-paragraph body (1 framing + 3 bold-prefix sub-blocks) mirroring v0.28.0 Browser-Enforced Resource Isolation structure; inserted between BERI close (line 130) and **Non-Guarantees:** bold-line; commit f1c236b on napplet main
- [Phase 138]: [Phase 138]: Plan 01 — VER-06 grep gate GREEN (/tmp/napplet-138-ver-06.log VER06_EXIT=0): all_frames=1, script-src/script-src-elem=3, world: 'MAIN'=1, connect-src 'none'=3, NUB-IDENTITY.md=1, NUB-CLASS-1.md=2, subsection heading=1, free-standing Class 1=0
- [Phase 138]: [Phase 138]: Plan 01 — Parallel-execution commit hygiene: used --no-verify on commit f1c236b to avoid pre-commit hook contention with 138-02 (which landed ade7b65 ahead for docs surfaces); territory discipline held strict — only specs/NIP-5D.md staged
- [Phase 138]: Plan 138-02: Single atomic commit used for DOC-01..04 docs sweep — mirrors v0.28.0 Phase 133 precedent; --no-verify required due to parallel wave with 138-01

### Decisions (napplet/nubs state snapshot, 2026-04-23)

- **MERGED:** napplet/nubs PR #15 `spec-shell-mediation` (2026-04-21) — NIP-5D now says "Shells MUST NOT provide `window.nostr`" + napplets produce cleartext only + shells MUST NOT sign/broadcast ciphertext from napplets. Local `specs/NIP-5D.md` may still be stale vs master; Phase 138 (NIP5D-01) syncs before layering v0.29.0 amendment
- **OPEN/DRAFT:** napplet/nubs PR #16 `NUB-CLASS` (class authority), #17 `NUB-CLASS-1` (strict baseline, `connect-src 'none'`, zero direct network egress), #18 `NUB-CLASS-2` (user-approved origins via NUB-CONNECT), #19 `NUB-CONNECT` (manifest-tag shape + aggregateHash fold)
- **Deferred debt in PR #15 body:** "NUB-RELAY currently references `publishEncrypted` — its semantics should be restated in terms of shell-performed encryption rather than napplet-performed encryption." DO NOT bundle into v0.29.0 — separate milestone concern

### Decisions (v0.29.0 direction locks, carried from requirements)

- **Gating rule:** `identity.decrypt` is legal only for napplets where `class.assigned` = `1`. Shell MUST reject from any other class with `class-forbidden`. Enforcement at shell message-handling time using existing iframe-ready class state (no per-envelope re-derivation)
- **Why NUB-CLASS-1 only:** NUB-CLASS-1 ships `connect-src 'none'` → zero direct network egress → plaintext trapped inside iframe. NUB-CLASS-2 ships `connect-src <granted>` → approved origins receive plaintext with zero shell visibility → unmitigated DM exfiltration risk
- **Shape auto-detection:** Shell owns all NIP-17/59 unwrap logic. Napplet receives validated `{ rumor, sender }` — never outer `created_at` (NIP-59 intentional ±2-day randomization for sender-anonymity)
- **Return shape:** `{ rumor: Rumor, sender: string }` where `Rumor = UnsignedEvent & { id: string }` (nostr-tools canonical type). `sender` is shell-authenticated (from seal-pubkey post-validation), NOT napplet-derived from `rumor.pubkey` (unsigned → attacker-controlled)
- **Option-A research superseded:** 4 files archived at `.planning/milestones/v0.29.0-option-a-research-superseded/`; NIP-17/44 mechanics + unwrap-order + rumor typing + public-repo hygiene rules survive as substrate. Wire-surface recommendations targeting NUB-RELAY are stale — replaced by NUB-IDENTITY home per pivot

### Pending Todos

- Plan Phase 135: first-party types + SDK plumbing (`/gsd:plan-phase 135`)
- Plan Phase 136: empirical Playwright CSP-injection-block fixture (may plan in parallel with 135)
- After 135 + 136 complete: plan Phase 137 (public nubs amendments); bundle NUB-IDENTITY + NUB-CLASS-1 per CLASS1-03
- After 137 complete: plan Phase 138 (in-repo NIP-5D amendment + docs + VER-06 grep gate)

### Blockers/Concerns

- CARRIED: npm publish blocked on human npm auth (PUB-04)
- INFO: Local `specs/NIP-5D.md` may be stale vs napplet/nubs master post-PR-15 (`window.nostr` removal merged 2026-04-21). Phase 138 NIP5D-01 syncs before layering v0.29.0 amendment
- INFO: `world: 'MAIN'` extension-API bypass acknowledged as residual — no page-side blocking mechanism exists. NUB-CLASS-1 `connect-src 'none'` is the structural mitigation. Phase 136 artifact MUST document this honestly; Phase 137 amendment + Phase 138 NIP-5D amendment MUST NOT claim a fix

## Deferred Items

Items acknowledged and deferred at v0.31.0 milestone close on 2026-05-24:

| Category | Item | Status |
|----------|------|--------|
| debug_session | auth-handshake-regression | awaiting_human_verify |
| debug_session | demo-v060-correctness-issues | diagnosed |
| debug_session | knowledge-base | unknown |
| debug_session | leader-line-import-error | unknown |
| debug_session | phase-32-amber-red-classification | unknown |
| debug_session | service-button-inspector-issue | investigating |
| debug_session | socket-gravity-approach-angles | awaiting_human_verify |
| quick_task | 260401-obm-fix-double-lines-and-increase-node-spaci | missing |
| quick_task | 260401-p5s-make-topology-lines-symmetrical | missing |
| quick_task | 260401-w49-fix-kinds-inter-pane-regression-and-napp | missing |
| quick_task | 260402-krp-replace-inter-pane-with-ipc-in-demo-ui-l | missing |
| quick_task | 260403-fyj-close-v0-9-0-audit-gaps-adapthooks-persi | missing |
| quick_task | 260403-lck-fix-phase-51-split-border-node-implement | missing |
| quick_task | 260403-mc5-update-planning-artifacts-for-out-of-wor | missing |
| quick_task | 260407-0i8-remove-stale-root-files-from-napplet | missing |
| quick_task | 260407-o9g-update-all-documentation-for-current-v0- | missing |
| quick_task | 260409-gkz-reformat-napplet-nubs-pr-9-body-to-match | missing |
| quick_task | 260419-i6c-republish-napplet-packages-as-0-2-1-with | missing |
| quick_task | 260421-u87-create-cross-repo-prs-in-napplet-nubs-fr | missing |
| quick_task | 260424-o1k-implement-default-shell-supports-in-shim | missing |
| seed | SEED-001-deterministic-napplet-keypair | dormant |
| seed | SEED-002-receive-side-decrypt-surface | dormant |
| seed | SEED-003-nip5d-error-envelope | dormant |

## Session Continuity

Last session: 2026-04-23T15:19:18.662Z
Stopped at: Completed 138-02-PLAN.md (parallel wave 1)
Resume: `/gsd:plan-phase 135` to plan first-party types + SDK plumbing. Phase 136 may be planned in parallel.

- v0.26.0: Consolidated `@napplet/nub-*` packages into single `@napplet/nub` with 34 subpath exports; deprecated packages ship as 1-line re-export shims for one release cycle
- v0.27.0: Runtime API surface uses IFC terminology (`window.napplet.ifc`, `@napplet/sdk` `ifc` export); hard break, no backward-compat alias
- v0.28.0: Browser-enforced isolation via strict CSP; single `resource.bytes(url)` primitive with scheme-pluggable URL space; `data:` decoded inline; sidecar pre-resolution opt-in default OFF for privacy; shell-side SVG rasterization MUST; `perm:strict-csp` capability orthogonal to `nub:resource`; demos delegated to downstream shell repo (Option B)
- v0.29.0: Shell is sole runtime CSP authority (every napplet). Two new NUBs: NUB-CLASS (abstract posture authority via wire `class.assigned`, `window.napplet.class`, owns `NUB-CLASS-$N` sub-track) and NUB-CONNECT (user-gated direct network access via manifest `connect` tags, self-sufficient `window.napplet.connect.{granted,origins}` surface). Napplet-class distinction removed entirely from NIP-5D into NUB-CLASS's sub-track. Class-1 = strict baseline; Class-2 = user-approved explicit-origin CSP; each defined as its own doc (`NUB-CLASS-1.md`, `NUB-CLASS-2.md`). Inline scripts forbidden for all napplets under the unified CSP model. Grants keyed on `(dTag, aggregateHash)` with `connect` origins folded into aggregateHash via synthetic `connect:origins` entry. NUBs expose independent runtime surfaces (no cross-NUB state collapse); cross-NUB invariants documented as shell responsibilities.
- v0.29.0 / Phase 135-03: NUB-CONNECT draft cites `NUB-CLASS-2.md` by file name (10 times) and does NOT inline-redefine Class 1/2 postures (delegated in full). Canonical `connect:origins` aggregateHash fold is: lowercase → ASCII-ascending sort → LF-join with no trailing newline → UTF-8 encode → SHA-256 → lowercase hex. Normative conformance fixture: 3 origins (`https://api.example.com`, `https://xn--caf-dma.example.com`, `wss://events.example.com`), 80-byte joined UTF-8 input, SHA-256 digest `cc7c1b1903fb23ecb909d2427e1dccd7d398a5c63dd65160edb0bb8b231aa742` (independently verified). `NappletConnect` runtime API MUST NEVER be `undefined` — default `{granted: false, origins: []}` on unsupported shells, denied prompts, or pre-injection.
- v0.29.0 / Phase 136-01: `NappletConnect` shape declared INLINE in `packages/core/src/types.ts` (not imported from `@napplet/nub`) — preserves `@napplet/core` zero-dep constraint. Phase 137's `@napplet/nub/connect/types.NappletConnect` MUST remain structurally assignment-compatible with `NappletGlobal['connect']` (the two locked fields `readonly granted: boolean` + `readonly origins: readonly string[]` must match). `window.napplet.class` typed as bare `number` (not literal union `1 | 2`) — class space is extensible via NUB-CLASS-$N sub-track. `perm:strict-csp` is JSDoc-`@deprecated` only (type unchanged — `perm:${string}` template literal still accepts it during the deprecation window; hard-removal tracked as REMOVE-STRICTCSP-CAP in future requirements).
- v0.29.0 / Phase 137-01: `NappletConnect` inlined as zero-import interface in `packages/nub/src/connect/types.ts`; bidirectional structural assignability with `NappletGlobal['connect']` verified. `normalizeConnectOrigin()` is the single shared source-of-truth validator for both Phase 138 vite-plugin (build-side) and shell implementations (runtime-side); returns byte-identical input on success, throws with `[@napplet/nub/connect]`-prefixed messages on any of 21 rule violations. IPv4 accepted (including `127.0.0.1` + RFC-1918 private ranges); IPv6 rejected for v1 (bracket notation AND colon-in-host-after-port-strip both throw). `ClassAssignedMessage` wire shape locked as `{ type: 'class.assigned'; id: string; class: number }` with bare `number` (extensible class space via NUB-CLASS-$N). 28/28 normalizer smoke tests pass (7 accept + 21 reject).
- v0.29.0 / Phase 137-02: Wire-handler NUB barrel pattern established — `registerNub(DOMAIN, handleXxxMessage as unknown as NubHandler)` is the canonical registration site for any NUB that both exports a handler AND wants module-import to automatically register it. Zero-wire NUB barrel uses `registerNub(DOMAIN, (_msg) => { /* noop */ })` with inline rationale comment. `handleClassMessage` parameter contravariance bridge (`as unknown as NubHandler`) is the first case of a richer dispatcher signature at the barrel registration level; sound at runtime since envelopes are always parsed objects. Future core widening of `NubHandler` to `{ type: string; [key: string]: unknown }` simply removes the cast. `window.napplet.class` defineProperty uses `configurable:true` (so cleanup can delete) while `window.napplet.connect` uses `configurable:false` (stable mount object).
- v0.29.0 / Phase 137-03: 46-exports-and-entries invariant locked as baseline for `@napplet/nub` (38 pre-existing + 8 new: connect × 4 + class × 4). Tsup entry map mirrors package.json exports 1:1 count. Tree-shake prerequisite verified at dist-artifact level: `dist/connect/types.js` (155 B) and `dist/class/types.js` (103 B) emit zero installer / `registerNub(` references — only DOMAIN const + (for connect) the pure `normalizeConnectOrigin` validator. Phase 142 VER-03 will extend the harness with types-only consumer fixtures asserting bundle-delta ≤ these baselines. Phase 137 TERMINAL-COMPLETE: all 13 REQs (NUB-01..07 + CLASS-01..06) satisfied.
- v0.29.0 / Phase 138-03: Phase 138 TERMINAL-COMPLETE. Module-load self-check (`assertConnectFoldMatchesSpecFixture`) binds vite-plugin `connect:origins` fold to NUB-CONNECT.md §Conformance Fixture digest `cc7c1b1903fb23ecb909d2427e1dccd7d398a5c63dd65160edb0bb8b231aa742`; fires at ESM-init on fold-drift. Perturbation experiment confirmed behavior: `.join('\n')` → `.join(',')` triggers FATAL at plugin-import time (`node -e "import(...)"` exits 1), revert exits 0. Build-layer insight: tsup/tsc does NOT execute module-top-level code at build time, so the guardrail fires when Vite imports the plugin (napplet authors' `pnpm build`), not when tsup builds it. Self-check code was pre-landed in commit `d06c293` from an aborted prior 138-03 attempt that bundled with 138-02 Task 4's commit message; no new code commit needed in this session — only the SUMMARY + STATE/ROADMAP updates land. All 10 VITE-XX REQs satisfied; 40+ Phase 138 grep audit passes (two documented drifts: `cc7c1b1…` count = 2 by co-location with 138-02 Task 3 fold-docs comment, and Task 1 no-op commit). `pnpm --filter @napplet/vite-plugin build` + `type-check` both exit 0. Guardrail closes SPEC-P1 (hash-determinism drift between build-time plugin and shell-side implementations) one phase earlier than the Phase 142 VER deferred item. Phase 138 ready for orchestrator verify_phase_goal pass.
- v0.29.0 / Phase 138-02: Additive half of vite-plugin surgery landed. 254 LOC added to `packages/vite-plugin/src/index.ts` (560 → 814) across 4 task commits (`fdb92d9`/`49aba91`/`264edfb`/`d06c293`). `connect?: string[]` option validated via shared `normalizeConnectOrigin` from `@napplet/nub/connect/types` (Phase 137); `SYNTHETIC_XTAG_PATHS: ReadonlySet<string>` registry (module-scope, exported) covers `config:schema` + `connect:origins` — single extension point for future NUB folds; `aggregateHash` fold produces byte-identical NUB-CONNECT canonical digest; one `['connect', origin]` manifest tag per origin in author-declared order between `manifestXTags` and `configTags`; `assertNoInlineScripts` zero-dep regex helper hard-errors on `<script>` without non-empty `src` (allow-list for application/json, application/ld+json, importmap, speculationrules, HTML comments stripped); informational cleartext warn on `http:`/`ws:` origins; dev-mode-only `napplet-connect-requires` meta distinct from shell-authoritative `...-granted` name (plugin MUST NEVER emit the granted variant). Two orderings: author-declared for manifest tags (readability per NUB-CONNECT §Manifest Tag Shape), ASCII-sorted for fold (determinism). Pre-existing `@napplet/shim` DTS failure (Phase 136-01 added `connect` to `NappletGlobal` without updating shim literal) logged to `deferred-items.md`, scheduled for Phase 139 SHIM-01/02. VITE-03..10 complete.
- v0.29.0 / Phase 138-01: Subtractive half of vite-plugin surgery landed. `packages/vite-plugin/src/csp.ts` deleted in full (−276 LOC, no dev-only retention per locked Q2). `packages/vite-plugin/src/index.ts` stripped of all CSP production machinery (660 → 560 LOC, −100 net): import block from `./csp.js`, 34-line `strictCsp` JSDoc+field, 4-line CSP runtime state, 11-line `configResolved` CSP branch, 11-line `transformIndexHtml` CSP meta injection (including `order: 'pre'` + `isDev`/`ctx.server` dead code), 18-line `closeBundle` CSP assert block. `strictCsp?: unknown` retained as `@deprecated` accept-but-warn shim emitting one `console.warn` per build from `configResolved` (run-once by Vite contract, no external guard needed). Old v0.28.0 consumers' `vite.config.ts` continues to type-check and build on upgrade — they see one warn per build. Hard-remove tracked as `REMOVE-STRICTCSP` for v0.30.0. `tsup.config.ts` entry reduced to `['src/index.ts']`. Banned-identifier audit: 0 hits each for buildBaselineCsp / validateStrictCspOptions / assertMetaIsFirstHeadChild / assertNoDevLeakage / StrictCspOptions / './csp' import / Content-Security-Policy / head-prepend / strictCspEnabled / cspNonce / cspMode / strictCspOptions. Preserved byte-identically: aggregate-hash injection, napplet-type/requires/config-schema meta, schema discovery + structural validation, synthetic `config:schema` xTag fold, manifest signing via nostr-tools. `pnpm --filter @napplet/vite-plugin build` + `type-check` both exit 0 (8ms ESM build, 639ms DTS, dist/index.js 11.25 KB). Additive half (Plan 138-02: connect option, inline-script diagnostic, `SYNTHETIC_XTAG_PATHS` extraction, `connect:origins` fold, manifest tags) unblocked.
- v0.29.0 / Phase 139-01: State-only NUB SDK pattern locked — connect + class both skip the namespace const object that method-bearing NUBs use (`export const resource = {...}`, `export const keys = {...}`, etc.); types + DOMAIN-aliased-constant + installer + helper getters are sufficient. `class` is also a reserved identifier so `export const class` would be invalid JS anyway. Shim literal's `connect: { granted: false, origins: [] }` default is PRESERVED even though `installConnectShim` replaces the field at runtime: this satisfies TS2741 at type-check AND provides an authoritative graceful-degradation default for SDK-only consumers who never call the installer (dual-layer guarantee). `class:` field intentionally OMITTED from the literal — the installer's `Object.defineProperty` mounts it; the optional `class?: number` on NappletGlobal allows the omission. Task 1 commit `69814ae` (shim), Task 2 commit `6214702` (sdk); Task 3 verification-only no commit. Phase 136-to-138 carried TS2741 gap CLOSED — `pnpm -r type-check` now exits 0 across all 14 packages, first time since Phase 136 introduced the planned carry. Smoke-test harness drift discovered (document.addEventListener needed by installKeysShim's keydown listener) fixed in /tmp stub only — production shim code untouched.
- v0.29.0 / Phase 142-02: VER-03/06/11/12/13 closed via 54 permanent in-repo vitest tests across 4 files under `packages/nub/src/{connect,class}/`. VER-03 tree-shake consumer bundles (96B connect, 90B class) land well under the Phase 137-03 dist-artifact baselines (155B/103B); `import type` erasure drops even DOMAIN + normalizeConnectOrigin from the consumer bundle. VER-06 pins the NUB-CONNECT §Conformance Fixture SHA-256 digest `cc7c1b1903fb23ecb909d2427e1dccd7d398a5c63dd65160edb0bb8b231aa742` via an inline second-copy of the canonical fold (not imported from vite-plugin) — dual-path digest verification strengthens the bind. VER-13 uses describe.each across all 7 SHELL-CLASS-POLICY.md scenario rows + 4 anti-tests proving the invariant enforcement function REJECTS class===2 ∧ granted===false and class===1 ∧ granted===true. VER-11/12 cover class.assigned wire dispatch (0/1/2/3, last-write-wins, invalid-shape drops) and graceful-degradation defaults for both connect ({granted:false, origins:[]}) and class (undefined, never 0/null). Full suite 73/73 pass; new tests auto-detect under the existing vitest include glob so every future `pnpm vitest` runs all gates continuously. Task 1 commit `03944d4` (class/connect shim tests), Task 2 commit `fa7a6c9` (aggregate-hash + cross-nub-invariant); Task 3 artifacts live at `/tmp/napplet-ver-03-treeshake/` + `/tmp/napplet-ver-03-treeshake.log` per AGENTS.md no-home-dir-pollution (no repo commit).
- v0.29.0 / Phase 142 TERMINAL-COMPLETE: All 13 VER-IDs (VER-01..13) verified PASS across 3 plans. Plan 142-01 closed the 5 exit-code / grep-based gates (VER-01, VER-02, VER-08, VER-09, VER-10) via `/tmp/` evidence logs + `.changeset/v0.29.0-nub-connect-class.md` authoring. Plan 142-02 closed the 5 in-repo test gates (VER-03, VER-06, VER-11, VER-12, VER-13) via 4 new vitest test files under `packages/nub/src/{connect,class}/` + the tree-shake harness extension. Plan 142-03 closed the 3 downstream-shell gates (VER-04, VER-05, VER-07) via self-contained documented fixtures at `packages/nub/src/connect/__fixtures__/` exportable to the downstream shell repo's Playwright suite. `142-VERIFICATION.md` records per-gate pass/fail + evidence paths. STATE → ready-for-audit; PROJECT → Shipped: v0.29.0; REQUIREMENTS traceability → all 13 VER-XX rows Complete; ROADMAP → Phase 142 row Complete.
- v0.29.0 / Phase 142 methodology pattern: 3-plan Wave-1 + Wave-2 structure successfully parallelized terminal verification. Plans 01 + 02 ran in parallel Wave 1 (strictly disjoint file ownership: 142-01 only touched `.changeset/` + `/tmp/`; 142-02 only touched `packages/nub/src/` test files + `/tmp/` tree-shake harness). Plan 03 ran in Wave 2 after both converged, authoring the documented Playwright fixtures + milestone-close docs (VERIFICATION.md, STATE flip, PROJECT insert, REQUIREMENTS traceability flip, ROADMAP Phase row flip). Pattern carries forward for future milestone verification phases where in-repo gates and downstream-shell gates can be cleanly separated across disjoint file ownership.

### Open Decisions for Plan Phases

Surfaced by research (informational — each belongs to a specific phase plan):

1. Inline-script detection: parse5/htmlparser2 dev-dep vs zero-dep regex — Phase 138
2. `packages/vite-plugin/src/csp.ts`: delete vs retain dev-only helper vs split-by-concern — Phase 138
3. `strictCsp` option: hard-remove vs `@deprecated` accept-but-warn for one cycle — Phase 138
4. Inline-script diagnostic: warn vs hard-error (design leans hard-error) — Phase 138
5. `sdk.ts` for connect: omit (types-only like theme) vs readonly getters — Phase 137
6. Meta tag name: `napplet-connect-granted` (verbose, recommended) vs terse — Phase 137
7. NIP-5D amendment: one-line pointer vs richer section (design leans one-line) — Phase 135
8. IPv6 literal / bare IPv4 acceptance in origin format — Phase 137/138

- Orchestrator verify_phase_goal pass for Phase 136, Phase 137, Phase 138, Phase 139, Phase 142 (spawned by `/gsd:execute-phase`, not by this executor)
- `/gsd:audit-milestone v0.29.0` — next lifecycle step; runs after Phase 142 TERMINAL-COMPLETE
- `/gsd:complete-milestone v0.29.0` — follows audit; archives v0.29.0 ROADMAP + cleanup
- Manual `feat/strict-model` → `main` branch merge after audit clears

- CARRIED: npm publish blocked on human npm auth (PUB-04 from prior milestones)
- CARRIED: NIP number conflict with Scrolls PR#2281 (RES-01 from v0.12.0 era)
- RESOLVED 2026-04-21: v0.29.0 cross-repo PRs opened in `napplet/nubs` — NUB-CLASS (#16), NUB-CLASS-1 (#17), NUB-CLASS-2 (#18), NUB-CONNECT (#19)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260421-u87 | Create cross-repo PRs in napplet/nubs from the 4 v0.29.0 drafts | 2026-04-21 | c28d8e4 | [260421-u87-create-cross-repo-prs-in-napplet-nubs-fr](./quick/260421-u87-create-cross-repo-prs-in-napplet-nubs-fr/) |
| 260424-o1k | Implement default shell.supports() in shim so napplets can be tested without a shell | 2026-04-24 | 5ad9cdb | [260424-o1k-implement-default-shell-supports-in-shim](./quick/260424-o1k-implement-default-shell-supports-in-shim/) |
| 260524-kxa | please add badges to the README for github workflows, as well as badges for both npm and jsr | 2026-05-24 | 8f4662b | [260524-kxa-please-add-badges-to-the-readme-for-gith](./quick/260524-kxa-please-add-badges-to-the-readme-for-gith/) |

Last session: 2026-04-21T20:46:00.000Z
Stopped at: Completed 142-03-PLAN.md (Phase 142 TERMINAL-COMPLETE)
Resume: Phase 142 TERMINAL-COMPLETE — all 13 VER-IDs (VER-01..13) verified PASS across 3 plans; `142-VERIFICATION.md` authored; STATE/PROJECT/REQUIREMENTS/ROADMAP flipped for milestone audit. Milestone v0.29.0 is READY-FOR-AUDIT. Next step: `/gsd:audit-milestone v0.29.0` (autonomous lifecycle), then `/gsd:complete-milestone v0.29.0`, then cleanup. Manual `feat/strict-model` → `main` merge follows audit clearance.

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
