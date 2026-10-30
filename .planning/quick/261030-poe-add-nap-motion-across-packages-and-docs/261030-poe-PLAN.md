---
phase: quick
plan: 261030-poe
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [GOAL-MOTION, GOAL-DOCS, GOAL-TESTS, GOAL-PR]
files_modified:
  - packages/core/src/types/motion.ts
  - packages/nap/src/motion/index.ts
  - packages/sdk/src/motion.ts
  - packages/shim/src/runtime.ts
  - packages/vite-plugin/src/requirements.ts
  - packages/conformance/src/run/boot.ts
  - apps/docs/naps/motion.md
must_haves:
  truths:
    - Consumers can use the complete proposed motion API through injected domains, SDK root/subpath exports, and NAP layered subpaths.
    - Permission requests correlate by id; state and samples are cached synchronously, with no stale samples exposed after focus loss.
    - Build inference and conformance recognize only the proposal's motion wire operations and preserve optional declarations.
    - Documentation, package export metadata, regression tests, and release metadata describe the shipped implementation together.
    - Required verification passes and a PR is opened from the isolated branch.
  artifacts:
    - packages/core/src/types/motion.ts
    - packages/nap/src/motion/shim.test.ts
    - packages/sdk/test/motion.test.mjs
    - packages/shim/src/motion.test.ts
    - packages/conformance/src/validators/motion.test.ts
    - packages/conformance/src/run/motion.test.ts
    - apps/docs/naps/motion.md
  key_links:
    - core NapDomain and NappletGlobal -> motion types -> NAP implementation -> shim routing and installation
    - SDK motion root/subpath exports -> injected window.napplet.motion
    - conformance fallback prelude -> motion permission/state/sample behavior
    - vite requirement inference -> motion R/O manifest declarations
---

<objective>
Implement NAP-MOTION support throughout the napplet/web packages and docs, from the isolated feat/nap-motion worktree. Stop only after updated tests and required gates pass and the PR is open. Existing unrelated checkout changes remain untouched.
</objective>

<context>
@AGENTS.md
@.planning/STATE.md
Canonical source: https://github.com/napplet/naps/pull/124, inspected at head 3069a945271f6ff20ff9aadb2ec00ee5b62fe683. NIP-5D source: https://github.com/nostr-protocol/nips/pull/2303. Do not copy either as an in-repo normative specification.

Use GAMEPAD as the current package wiring pattern, not as authority for MOTION behavior. Graph project napplet-motion, Tier 2, generation 2026-10-30T17:29:18Z: installGamepadShim inbound trace reaches installDomainShim then installNappletGlobal. Exact coverage checked for relevant client and conformance sources. Read source for partial core/index.ts:241, nap/gamepad/index.ts:5 and conformance/reference-shell.ts:26; apps/docs and scripts are excluded, so direct reads are required.

No new dependencies. Dependencies are already installed with the frozen lockfile. No physical host sensor implementation is implied by this client/conformance repository: the reference shell may truthfully report unavailable, and docs must distinguish that from a sensor-capable host.
</context>

<tasks>
<task type="tracer" tdd="true">
  <name>Task 1: Complete motion client path and package exports</name>
  <files>packages/core/src/types/motion.ts, packages/core/src/types/global.ts, packages/core/src/envelope.ts, packages/core/src/types.ts, packages/core/src/index.ts, packages/nap/src/motion/types.ts, packages/nap/src/motion/state.ts, packages/nap/src/motion/shim.ts, packages/nap/src/motion/sdk.ts, packages/nap/src/motion/index.ts, packages/nap/src/motion/shim.test.ts, packages/nap/package.json, packages/nap/jsr.json, packages/nap/tsup.config.ts, packages/sdk/src/motion.ts, packages/sdk/src/index.ts, packages/sdk/src/nap-types.ts, packages/sdk/src/nap-runtime.ts, packages/sdk/package.json, packages/sdk/jsr.json, packages/sdk/tsup.config.ts, packages/sdk/test/motion.test.mjs, packages/shim/src/runtime.ts, packages/shim/src/runtime-globals-core.ts, packages/shim/src/motion.test.ts</files>
  <behavior>First add a failing SDK-to-runtime-to-wire test. Cover optional domain absence, default state, first-use subscription, permission id correlation with optional absolute, success/denial/error results, state/sample delivery, independent close handles, malformed envelopes, foreign source rejection, cache mutation isolation, focus-loss invalidation, permission revocation, and teardown/reinstallation. No sample is fabricated during a pause.</behavior>
  <action>Own core, nap, sdk, and shim source/tests/export manifests. Implement the five canonical operations requestPermission(absolute?), state(), latest(), onState(handler), and onSample(handler), and exact schema/wire types from NAP-MOTION API Surface and Wire Protocol. Reuse existing request correlation and parent-source-checked routing. Preserve the specified initial state and null latest behavior while unfocused; discard stale samples on loss of eligibility. Subscribe before/on first use and unsubscribe on binding cleanup. Expose SDK root and @napplet/sdk/motion plus @napplet/nap/motion and its types/shim/sdk subpaths consistently in npm, JSR, and build entries. Preserve optional runtime injection. Avoid native event API replacements: these are optional projection guidance and cannot safely be enabled without proof native APIs are denied. Record RED then GREEN evidence.</action>
  <verify><automated>pnpm --filter @napplet/nap test:unit -- src/motion/shim.test.ts &amp;&amp; pnpm --filter @napplet/shim test:unit -- src/motion.test.ts &amp;&amp; pnpm --filter @napplet/sdk test:unit</automated></verify>
  <done>Full motion client API works through the real runtime and SDK, all public import surfaces resolve, and lifecycle/security regression tests pass.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Conformance, inference, and user guidance</name>
  <files>packages/conformance/src/validators/envelope-specs.ts, packages/conformance/src/validators/motion.test.ts, packages/conformance/src/shell/reference-responses.ts, packages/conformance/src/run/boot.ts, packages/conformance/src/run/motion.test.ts, packages/vite-plugin/src/requirements.ts, packages/vite-plugin/src/index.test.ts, apps/docs/naps/motion.md, apps/docs/naps/index.md, apps/docs/.vitepress/config.ts, apps/docs/packages/core.md, apps/docs/packages/nap.md, apps/docs/packages/sdk.md, apps/docs/packages/shim.md, apps/docs/packages/conformance.md, packages/core/README.md, packages/nap/README.md, packages/sdk/README.md, packages/shim/README.md, packages/vite-plugin/README.md, packages/conformance/README.md, README.md, skills/napplet-sdk/SKILL.md, skills/napplet-design/SKILL.md, skills/napplet-build/SKILL.md, skills/napplet-test/SKILL.md</files>
  <behavior>First prove missing wire/inference support fails. Accept the six defined motion message types with their direction and id rules; reject invented calls and malformed parameters. Reference shell reports unavailable state and correlated permission error without prompting or samples. Fallback prelude and package binding agree on default/cache/listener/permission semantics. Optional motion imports retain O and do not become R.</behavior>
  <action>Own conformance and vite-plugin sources/tests plus docs and skills, without editing Task 1 files. Extend envelope checks and deterministic reference responses. Give the handwritten fallback prelude the complete motion API and the same parent-source validation, synchronous caches, request correlation, and listener isolation as the package implementation; share serializable helpers when existing architecture allows. Add accelerometer, gyroscope, and magnetometer denial to harness iframe Permissions Policy while preserving existing gamepad denial; make no claim that every browser enforces it. Add motion to requirement inference and test required versus optional declarations. Write a linked, explicitly non-normative MOTION guide with user-action permission requests, separate absolute grant, focus pause handling, optional-domain fallback, and native-isolation limitations. Update only current relevant package/docs/skill surfaces; do not rewrite historical planning records. Read each candidate doc before updating; skip absent candidates and record that fact.</action>
  <verify><automated>pnpm --filter @napplet/conformance test:unit -- src/validators/motion.test.ts src/run/motion.test.ts &amp;&amp; pnpm --filter @napplet/vite-plugin test:unit &amp;&amp; pnpm test:skills-contracts</automated></verify>
  <done>Conformance and build tooling support the canonical motion contract, fallback behavior is tested, and discoverable docs describe exactly the shipped API.</done>
</task>

<task type="auto">
  <name>Task 3: Integrate, verify, and open the PR</name>
  <files>.changeset/motion-support.md, .planning/quick/261030-poe-add-nap-motion-across-packages-and-docs/261030-poe-SUMMARY.md, .planning/STATE.md</files>
  <action>Leader owns this task after both implementation lanes finish. Review exact diff and protocol fidelity, resolve integration gaps, and add changesets for packages whose shipped output changed. Audit remaining domain inventories, runtime hosts, package exports, and current docs; changes beyond the enumerated paths require observed affected behavior, not broad copy/paste. Run required checks and record results, limitations, and RED evidence. Use the existing aislop 0.12.0 policy without disabling rules; .aislop/config.yml is absent and must not be invented to silence findings. Commit explicit owned paths with Conventional Commit intent and Lore trailers plus agent attribution, push feat/nap-motion, open a clear PR, and confirm remote PR head matches the verified commit. Do not publish or merge.</action>
  <verify><automated>pnpm build &amp;&amp; pnpm type-check &amp;&amp; pnpm -r test:unit &amp;&amp; pnpm check:jsr &amp;&amp; pnpm test:skills-contracts &amp;&amp; git diff --check origin/main...HEAD</automated></verify>
  <done>Build, type checks, unit suites, export validation, relevant docs checks and existing quality gate pass; updated docs and changesets are committed; PR is open at the tested head.</done>
</task>
</tasks>

<execution_order>
Tasks 1 and 2 are disjoint ownership lanes and may be implemented concurrently after agreeing on the exact canonical MotionApi types. Task 2 can write wire/docs tests independently but waits for Task 1 package exports before final integration tests. Task 3 follows both. Executors are not alone in the worktree; never revert another lane's edits. Leader owns integration, release metadata, global tests, commits, and PR.
</execution_order>

<threat_model>
Parent messages are a trust boundary: preserve source checks and reject malformed snapshots. Cached motion is sensitive: invalidate on focus/grant loss and never fabricate zero readings. Absolute orientation is separately granted: tests prevent exposure when state lacks that grant. Sensor policy is best effort: apply host denial features and disclose enforcement limits. No dependencies are added.
</threat_model>

<source_audit>
GOAL-MOTION: Tasks 1 and 2 cover all six affected package implementations; CLI/conformance-cli/boilerplate consume those packages and require changes only if their own current inventories or bundled output need updating. GOAL-DOCS: Task 2. GOAL-TESTS: all tasks. GOAL-PR and isolated worktree: Task 3 and current branch. This ad-hoc quick task has no separate ROADMAP requirement IDs, RESEARCH.md, or CONTEXT.md decisions; canonical proposal and explicit user goal govern scope. No source items are omitted.
</source_audit>

<output>Create 261030-poe-SUMMARY.md with final evidence and status; update the quick-task record in STATE.md without changing historical phase completion.</output>
