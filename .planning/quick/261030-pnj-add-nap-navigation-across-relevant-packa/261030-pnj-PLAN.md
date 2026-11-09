---
phase: quick-nap-navigation
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [GOAL-NAVIGATION, GOAL-DOCS, GOAL-TESTS, GOAL-PR]
files_modified:
  - packages/core/src/types/navigation.ts
  - packages/core/src/types.ts
  - packages/core/src/types/global.ts
  - packages/core/src/index.ts
  - packages/core/src/envelope.ts
  - packages/nap/src/navigation/index.ts
  - packages/nap/src/navigation/types.ts
  - packages/nap/src/navigation/shim.ts
  - packages/nap/src/navigation/sdk.ts
  - packages/nap/src/navigation/shim.test.ts
  - packages/nap/package.json
  - packages/nap/jsr.json
  - packages/nap/tsup.config.ts
  - packages/shim/src/runtime.ts
  - packages/shim/src/runtime-globals-core.ts
  - packages/shim/src/prelude.ts
  - packages/shim/src/navigation.test.ts
  - packages/sdk/src/navigation.ts
  - packages/sdk/src/index.ts
  - packages/sdk/src/nap-types.ts
  - packages/sdk/package.json
  - packages/sdk/jsr.json
  - packages/sdk/tsup.config.ts
  - packages/sdk/test/navigation.test.mjs
  - packages/vite-plugin/src/requirements.ts
  - packages/vite-plugin/src/requirements.test.ts
  - packages/conformance/src/validators/navigation.ts
  - packages/conformance/src/validators/navigation.test.ts
  - packages/conformance/src/validators/envelope-specs.ts
  - packages/conformance/src/validators/envelope-validation.ts
  - packages/conformance/src/validators/envelope.drift.test.ts
  - packages/conformance/src/shell/reference-navigation.ts
  - packages/conformance/src/shell/reference-navigation.test.ts
  - packages/conformance/src/shell/reference-shell.ts
  - packages/conformance/src/shell/reference-handler.ts
  - packages/conformance/src/shell/reference-intents.ts
  - packages/conformance/src/shell/reference-responses.ts
  - packages/core/src/types/intent.ts
  - packages/nap/src/intent/shim.ts
  - packages/nap/src/intent/shim.test.ts
  - README.md
  - packages/core/README.md
  - packages/nap/README.md
  - packages/shim/README.md
  - packages/sdk/README.md
  - packages/conformance/README.md
  - apps/docs/naps/navigation.md
  - apps/docs/naps/index.md
  - apps/docs/.vitepress/config.ts
  - apps/docs/packages/core.md
  - apps/docs/packages/nap.md
  - apps/docs/packages/shim.md
  - apps/docs/packages/sdk.md
  - apps/docs/packages/conformance.md
  - skills/napplet-sdk/SKILL.md
  - skills/napplet-interop/SKILL.md
  - .changeset/intent-navigation-history.md
must_haves:
  truths:
    - Navigation report/get calls are available through typed SDK root and subpath APIs and injected runtime domains only when exposed.
    - Runtime-owned history follows the published draft's revision, eligibility, isolation, retention, and correlated traversal rules.
    - Package exports, manifest inference, conformance validation, documentation, and release metadata agree on the shipped surface.
    - Required checks pass on the PR branch and an open PR contains only this work.
  artifacts:
    - packages/core/src/types/navigation.ts
    - packages/nap/src/navigation/shim.ts
    - packages/sdk/src/navigation.ts
    - packages/conformance/src/shell/reference-navigation.test.ts
    - apps/docs/naps/navigation.md
  key_links:
    - SDK navigation namespace delegates to the injected NavigationApi.
    - Runtime installer routes navigation result envelopes to the domain shim.
    - Reference-shell navigation state is scoped by authenticated endpoint and verified manifest contracts.
    - History revisits correlate only through the approved IntentDelivery.id contract.
---

<objective>
Implement NAP-NAVIGATION across the relevant packages and documentation, with tested protocol behavior and an open PR from the isolated feat/nap-navigation worktree. This is an implementation plan, not a normative protocol document.
</objective>

<context>
Worktree: the isolated repository worktree. Base: origin/main f6839146. Leave the original checkout and its unrelated showcase work untouched.

Canonical sources: [NAP-NAVIGATION proposal #126](https://github.com/napplet/naps/pull/126), inspected head 778f0dc19fe2d80448b2aecfea8cef3425df82c0; [web binding](https://github.com/napplet/naps/blob/nap-navigation/projections/web.md#internal-navigation-binding-draft); [NIP-5D #2303](https://github.com/nostr-protocol/nips/pull/2303), inspected head 6e24617cde507c0a87fa170af9ed6b2b46545b2d. Local fetched texts are /tmp/NAP-NAVIGATION.md, /tmp/napplet-web-projection.md, and /tmp/napplet-5D.md. Recheck live heads before final verification.

Dependency resolved by the user on 2026-10-30: "Target both drafts; #128 remains intended." This implementation targets NAVIGATION #126 and [INTENT #128](https://github.com/napplet/naps/pull/128), inspected head 652524288c269c9acc823e041e915d1d1f891d6b. The latter is closed and unmerged, but the user confirmed it remains the intended published contract. Implement its delivery IDs and shell provenance with navigation traversal; keep draft status explicit in public guidance.

Reuse the existing domain pattern: core owns public types, nap owns domain envelopes/shim/helpers, shim installs selected namespaces, sdk delegates to injected domains, and conformance owns the reference runtime. Do not move runtime-owned history into the napplet shim. Do not add dependencies or new wire operations. Navigation's required intent layering does not authorize automatically granting intent or adding invented manifest rules.

Graph evidence: Tier 2, project napplet-navigation, generation 2026-10-30T17:28:14Z. installDomainShim is called by installNappletGlobal, reached from index and prelude. Tests and apps/docs are excluded from the fast index; core and SDK barrel reexports have partial parsing, so read these directly. Discovery also found the separate vite-plugin domain allowlist and SDK's explicit gamepad subpath/build entries.
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Wire report/get through every package boundary</name>
  <files>packages/core/src/types/navigation.ts, packages/core/src/types.ts, packages/core/src/types/global.ts, packages/core/src/index.ts, packages/core/src/envelope.ts, packages/nap/src/navigation/index.ts, packages/nap/src/navigation/types.ts, packages/nap/src/navigation/shim.ts, packages/nap/src/navigation/sdk.ts, packages/nap/src/navigation/shim.test.ts, packages/nap/package.json, packages/nap/jsr.json, packages/nap/tsup.config.ts, packages/shim/src/runtime.ts, packages/shim/src/runtime-globals-core.ts, packages/shim/src/prelude.ts, packages/shim/src/navigation.test.ts, packages/sdk/src/navigation.ts, packages/sdk/src/index.ts, packages/sdk/src/nap-types.ts, packages/sdk/package.json, packages/sdk/jsr.json, packages/sdk/tsup.config.ts, packages/sdk/test/navigation.test.mjs, packages/vite-plugin/src/requirements.ts, packages/vite-plugin/src/requirements.test.ts</files>
  <behavior>Expose exactly report/get and their four wire messages from NAVIGATION's API Surface and Wire Protocol sections. A real SDK report call reaches the selected injected shim, posts the exact envelope, and resolves the corresponding result. Unavailable domains produce the existing SDK unavailable-domain behavior. Foreign-source, wrong-type, unmatched, and duplicate replies do not resolve another request. Teardown and transport timeout release pending resources. Preserve rejected NavigationResult values rather than treating them as transport failures. Verify npm/JSR subpath imports and navigation requirement inference.</behavior>
  <action>Owner: package integration executor, with exclusive ownership of core/nap/shim/sdk and vite-plugin files listed here. First add a failing navigation integration test using existing shim test infrastructure, then wire the real report/get path. Define the draft's JSON value, location, report, entry, view, result, error, and API types without adding controls the napplet does not own. Add optional navigation to NappletGlobal and domain registries, named navigationReport/navigationGet helpers and ergonomic report/get subpath aliases, plus the SDK navigation namespace. Match existing package export and tsup conventions; preserve all existing exports. The request shim transports reports without assigning report revisions or mutating history. Add navigation to vite-plugin inference and tests for root SDK, SDK subpath, NAP subpaths, and window namespace usage. Commit only after focused tests and builds pass.</action>
  <verify><automated>pnpm --filter @napplet/core build && pnpm --filter @napplet/nap build && pnpm --filter @napplet/shim build && pnpm --filter @napplet/sdk build && pnpm --filter @napplet/nap test:unit && pnpm --filter @napplet/shim test:unit && pnpm --filter @napplet/sdk test:unit && pnpm --filter @napplet/vite-plugin test:unit && pnpm check:jsr</automated></verify>
  <done>Consumers can import and call navigation.report/get through root and subpath APIs; selected runtime injection and wire correlation are proven; unrelated domains retain their behavior.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Implement runtime history and prove the full draft contract</name>
  <files>packages/conformance/src/validators/navigation.ts, packages/conformance/src/validators/navigation.test.ts, packages/conformance/src/validators/envelope-specs.ts, packages/conformance/src/validators/envelope-validation.ts, packages/conformance/src/validators/envelope.drift.test.ts, packages/conformance/src/shell/reference-navigation.ts, packages/conformance/src/shell/reference-navigation.test.ts, packages/conformance/src/shell/reference-shell.ts, packages/conformance/src/shell/reference-handler.ts, packages/conformance/src/shell/reference-intents.ts, packages/conformance/src/shell/reference-responses.ts, packages/core/src/types/intent.ts, packages/nap/src/intent/shim.ts, packages/nap/src/intent/shim.test.ts</files>
  <precondition>The user confirmed both published drafts remain intended; use the cited INTENT #128 contract for delivery IDs and traversal.</precondition>
  <behavior>Cover all 30 NAVIGATION Conformance Cases with behavior assertions. Include report/get before initial state; push, replace, duplicate invocations, null locations; exact convention and complete parameter-list eligibility; structured JSON, unknown fields, non-finite numbers; identical retries versus changed equal revisions; rejected-report high-water ordering; per-instance isolation; retention and capacity; pending traversal, duplicate target values, redirects, declined guards, supersession, finite timeout, late reports, unknown/foreign IDs, endpoint loss, and no position movement on intent acceptance alone.</behavior>
  <action>Owner: runtime/conformance executor; coordinate core/nap intent edits with Task 1's owner after the dependency resolution. Build endpoint-scoped history state in the reference runtime, reusing manifest catalog eligibility helpers. Keep all four navigation envelopes in conformance inventory and add shape validation tied to canonical clauses. Recognized navigation requests with usable IDs must still receive a correlated rejection result when the report is malformed; do not let reference-handler's current generic invalid-envelope early return suppress that required response. Track accepted report plus highest usable observed revision, compare JSON maps without key-order sensitivity, preserve field-presence distinctions, and apply report changes atomically. Maintain unique visit IDs and current/pending retention rules. If the dependency is confirmed, implement its exact target-scoped delivery IDs and shell provenance, and add runtime-only traversal controls that dispatch ordinary intent.deliver to the same existing endpoint. No new napplet wire operation, listener, outcome, selector, or payload metadata. Tests prove the callback/queue boundary cannot substitute another instance, restart a target, or infer correlation from invocation equality. Update affected intent fixtures and validator tests together.</action>
  <verify><automated>pnpm --filter @napplet/core build && pnpm --filter @napplet/nap build && pnpm --filter @napplet/conformance test:unit && pnpm --filter @napplet/nap test:unit && pnpm --filter @napplet/core test:unit</automated></verify>
  <done>Every published NAVIGATION conformance case has passing coverage and a clear implementation path; the intent dependency is resolved and traversal is implemented against that contract. No reduced report/get-only completion claim.</done>
</task>

<task type="auto">
  <name>Task 3: Synchronize guidance, verify the repository, and open the PR</name>
  <files>README.md, packages/core/README.md, packages/nap/README.md, packages/shim/README.md, packages/sdk/README.md, packages/conformance/README.md, apps/docs/naps/navigation.md, apps/docs/naps/index.md, apps/docs/.vitepress/config.ts, apps/docs/packages/core.md, apps/docs/packages/nap.md, apps/docs/packages/shim.md, apps/docs/packages/sdk.md, apps/docs/packages/conformance.md, skills/napplet-sdk/SKILL.md, skills/napplet-interop/SKILL.md, .changeset/intent-navigation-history.md</files>
  <action>Owner: documentation/release executor or parent; begins after public API names stabilize. Add non-normative guidance linking the living drafts, availability checks, declared intent dependency, committed-state reporting, serialized monotonic revisions, retry semantics, failure recovery, and intent delivery correlation. Examples must use real shipped SDK imports and omit native History API interception or napplet-owned history controls. Update package/domain listings and inspect remaining active README/docs/skills references for stale delivery-ID claims; keep historical planning records historical. Audit apps, CLI, boilerplate, and conformance runner domain enumerations to identify any hardcoded supported-domain surface not automatically covered by NAP_DOMAINS; update only relevant explicit surfaces and tests. Add changesets for packages whose shipped output changes, with a minor bump for a breaking pre-1.0 IntentDelivery contract. Do not publish locally or sweep unrelated changes into commits. Run required repository gates, inspect failures and repair task-caused defects, run independent review before opening, then push feat/nap-navigation and create a PR describing draft status, resolved dependency, behavior, and exact validation. Record summary and STATE completion only after full acceptance holds.</action>
  <verify><automated>pnpm build && pnpm type-check && pnpm -r test:unit && pnpm check:jsr && pnpm test:skills-contracts && pnpm check:links && git diff --check origin/main...HEAD && git diff --check</automated></verify>
  <done>Required gates pass, pinned aislop 0.12.0 scan passes without added suppressions, changed packages have release metadata, docs match shipped behavior, reviewed commits are pushed, and gh pr view confirms an open PR at the tested head.</done>
</task>

</tasks>

<threat_model>
Untrusted napplet reports cross into runtime history; only authenticated endpoint binding and verified manifest contracts authorize access. Mitigate spoofing by endpoint-scoped state and delivery IDs, tampering by complete atomic validation and revision ordering, disclosure by isolated reads, denial of service with documented finite limits/timeouts, and elevation of privilege by keeping traversal selection and intent provenance runtime-owned. Labels remain plain text; reports never dispatch their own locations. Do not add dependencies.
</threat_model>

<verification>
Run the repository commands in Task 3 on the final branch head. Run the pinned repository-wide aislop 0.12.0 scan, report the actual score and any independent advisory, and keep existing policy unchanged. Independently review source boundaries, replay/correlation state, malformed requests, public exports, and test coverage against the live spec. Confirm worktree git status and PR head SHA match the tested commits. No merge or publication requested.
</verification>

## Source coverage audit

- GOAL-NAVIGATION: Tasks 1 and 2 cover all relevant package surfaces and full runtime history behavior; the user-confirmed INTENT #128 dependency is included.
- GOAL-DOCS: Task 3 covers active package/site/skill guidance and domain-list audit.
- GOAL-TESTS: Tasks 1 and 2 add behavioral coverage; Task 3 runs full mandatory gates.
- GOAL-PR: Task 3 opens and verifies the PR after review and validation.
- REQ: This ad-hoc quick task has no assigned ROADMAP requirement IDs; goal-derived IDs above preserve the user objective without altering milestone scope.
- RESEARCH: Canonical source discovery is recorded in context; no separate research artifact exists.
- CONTEXT: User requires an isolated worktree and tests passing plus PR opened. No CONTEXT.md or numbered locked decisions exist. The dependency question is pending, not silently decided.

<output>
Create .planning/quick/261030-pnj-add-nap-navigation-across-relevant-packa/261030-pnj-SUMMARY.md with verification evidence and PR URL; parent updates .planning/STATE.md. The planner makes no code edits or commits.
</output>
