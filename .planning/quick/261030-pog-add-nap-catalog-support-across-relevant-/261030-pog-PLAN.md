---
quick_id: 261030-pog
phase: quick-nap-catalog
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [CATALOG-PACKAGES, CATALOG-DOCS, CATALOG-TESTS, CATALOG-PR]
files_modified:
  - packages/core/src/types/catalog.ts
  - packages/nap/src/catalog/shim.ts
  - packages/shim/src/runtime.ts
  - packages/sdk/src/catalog.ts
  - packages/conformance/src/shell/intent-catalog.ts
  - packages/vite-plugin/src/requirements.ts
  - apps/docs/naps/catalog.md
estimate:
  tokens: 35000
  raw_tokens: 35000
  tasks: 3
  confidence: low
must_haves:
  truths:
    - Consumers can request a catalog snapshot through the injected domain, layered NAP exports, and SDK.
    - Reference tooling reports complete verified descriptors and consistent opaque selectors without launching napplets.
    - Build, types, unit tests, export checks, and the quality gate pass on the PR branch.
    - Documentation describes the shipped API and links the living draft; a PR is open.
  artifacts:
    - packages/core/src/types/catalog.ts
    - packages/nap/src/catalog/shim.ts
    - packages/sdk/src/catalog.ts
    - apps/docs/naps/catalog.md
  key_links:
    - Runtime allowlist and injected catalog object connect to catalog.get request correlation.
    - Reference catalog selectors match intent candidates for shared entries.
    - npm and JSR exports expose matching catalog surfaces.
---

# Add NAP-CATALOG support

<objective>
Implement the published NAP-CATALOG draft across the relevant package surfaces, update documentation, and ship an open PR from this isolated worktree. This plan is non-normative implementation guidance; the living specifications govern protocol behavior.
</objective>

## Canonical evidence

- [NAP-CATALOG proposal](https://github.com/napplet/naps/pull/95), reviewed at `1020ae53884a177b7ffc58a679126bc8800d0c6d`: API Surface, Catalog selectors, Manifest mapping, Wire Protocol, Shell Behavior, and Security Considerations.
- [Living NAP-CATALOG text](https://github.com/napplet/naps/blob/nap-catalog/naps/NAP-CATALOG.md).
- [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303), reviewed `5D.md` at `6e24617cde507c0a87fa170af9ed6b2b46545b2d`: Transport, Identity, Manifest, and Runtime Domain Availability.

## Boundaries

Work in `feat/nap-catalog`, based on `origin/main` at `f6839146`. Preserve the original checkout and its unrelated showcase edits. Reuse existing domain installers, request correlation, wrappers, and reference intent catalog. Add no dependencies or protocol operations beyond the published draft. Catalog is read-only, and domain availability is independent of intent. Do not turn runtime-specific helper behavior into conformance requirements.

<tasks>

<task type="tracer" tdd="true">
  <name>1. Expose catalog.get through core, NAP, shim, and SDK</name>
  <files>packages/core/src/types/catalog.ts, packages/core/src/types.ts, packages/core/src/index.ts, packages/core/src/types/global.ts, packages/core/src/envelope.ts, packages/nap/src/catalog/index.ts, packages/nap/src/catalog/types.ts, packages/nap/src/catalog/shim.ts, packages/nap/src/catalog/sdk.ts, packages/nap/src/catalog/shim.test.ts, packages/nap/package.json, packages/nap/jsr.json, packages/nap/tsup.config.ts, packages/shim/src/runtime.ts, packages/shim/src/runtime-globals-core.ts, packages/shim/src/catalog.test.ts, packages/shim/src/prelude.test.ts, packages/sdk/src/catalog.ts, packages/sdk/src/index.ts, packages/sdk/package.json, packages/sdk/jsr.json, packages/sdk/tsup.config.ts, packages/sdk/test/catalog.test.mjs</files>
  <behavior>Test the canonical snapshot through request/result correlation; successful empty catalog; runtime error rejection; unrelated IDs and message types; timeout cleanup; missing-domain behavior; catalog-only allowlist; public root and subpath imports.</behavior>
  <action>Implement the published schemas and catalog.get/result envelopes. Preserve opaque IDs and queryless convention strings exactly. Follow existing domain plumbing, with optional CatalogApi on NappletGlobal. Include the domain in supported registries, installer routing, prelude output, npm/JSR export maps, and build entries. Expose the ergonomic catalog object through the SDK root and catalog subpath and the layered NAP catalog subpaths. Use existing request lifecycle and error handling rather than inventing a separate transport. Write regression tests before implementing behavior, including a runnable SDK-to-injected-domain request/result path.</action>
  <verify><automated>pnpm --filter @napplet/core --filter @napplet/nap --filter @napplet/shim --filter @napplet/sdk build &amp;&amp; pnpm --filter @napplet/core --filter @napplet/nap --filter @napplet/shim --filter @napplet/sdk test:unit &amp;&amp; pnpm check:jsr</automated></verify>
  <done>All consumer paths can retrieve a snapshot; unavailable catalog fails clearly; allowlists do not expose catalog implicitly; exports build and tests pass.</done>
</task>

<task type="auto" tdd="true">
  <name>2. Support catalog in reference conformance and build tooling</name>
  <files>packages/conformance/src/shell/intent-catalog.ts, packages/conformance/src/shell/intent-catalog.test.ts, packages/conformance/src/shell/reference-shell.ts, packages/conformance/src/shell/reference-shell.test.ts, packages/conformance/src/shell/reference-responses.ts, packages/conformance/src/validators/envelope-specs.ts, packages/conformance/src/validators/envelope-validation.ts, packages/conformance/src/validators/envelope-types.ts, packages/conformance/src/validators/catalog.test.ts, packages/conformance/src/run/bindings.test.ts, packages/vite-plugin/src/requirements.ts, packages/vite-plugin/src/index.test.ts</files>
  <behavior>Cover named/root/snapshot identity, same dTag across publishers, role-less entries, out-of-order z/i tags, unmatched and query/fragment intents, separate parameter metadata, complete R/O lists, omitted incomplete records, unique stable IDs, filtered current-handler null behavior, no intent resolver, correlated errors, and successful empty snapshots.</behavior>
  <action>Extend the reference shell using already-verified manifest fixtures, including content and artifact hashes, and share selector derivation with intent discovery. Build handlers from retained records; never substitute a filtered selected handler. Keep catalog availability independent of running instances and intent capability. Source each envelope validation assertion from NAP-CATALOG Wire Protocol and Schemas. Audit existing validators and browser reference bindings for domain lists and response dispatch so real installed catalog calls work there. Recognize catalog declarations in vite requirements and prove R/O handling, without changing manifest syntax or adding unsupported assertions. Additional files discovered in these same responsibilities are allowed when needed for wiring; report them in the execution summary.</action>
  <verify><automated>pnpm --filter @napplet/conformance --filter @napplet/vite-plugin test:unit</automated></verify>
  <done>Reference tooling responds with complete policy-consistent snapshots and correlated errors; validators recognize the canonical envelopes; build-time declarations accept catalog.</done>
</task>

<task type="auto">
  <name>3. Document, verify, version, and open the PR</name>
  <files>README.md, packages/core/README.md, packages/nap/README.md, packages/shim/README.md, packages/sdk/README.md, packages/conformance/README.md, apps/docs/naps/catalog.md, apps/docs/naps/index.md, apps/docs/.vitepress/config.ts, apps/docs/packages/core.md, apps/docs/packages/nap.md, apps/docs/packages/shim.md, apps/docs/packages/sdk.md, apps/docs/packages/conformance.md, skills/napplet-sdk/SKILL.md, skills/napplet-interop/SKILL.md, .changeset/nap-catalog.md, .planning/STATE.md, .planning/quick/261030-pog-add-nap-catalog-support-across-relevant-/261030-pog-SUMMARY.md</files>
  <action>Document only shipped APIs with optional-domain examples, read-only behavior, opaque selectors, and plain-text display treatment. Mark explanatory guidance non-normative and link the living proposal rather than vendoring it. Audit active domain lists and package docs/skills for omissions; keep paragraphs on single physical lines. Add changesets for changed shipped outputs and prepare release metadata following repository policy; include generated version/changelog/JSR updates if version-packages is run. Run all required checks and inspect outputs. Use the existing pinned AI-slop workflow configuration without weakening it. Review the complete diff, commit explicit paths with Conventional Commit intent and Lore/Co-Authored-By trailers, push the feature branch, and open a PR describing behavior, draft status, validation, and limits. Record evidence and the PR URL in the quick summary and STATE without changing ROADMAP.</action>
  <verify><automated>pnpm build &amp;&amp; pnpm type-check &amp;&amp; pnpm -r test:unit &amp;&amp; pnpm check:jsr &amp;&amp; pnpm test:skills-contracts &amp;&amp; git diff --check origin/main...HEAD</automated></verify>
  <done>Docs match runtime and export surfaces; required tests and quality checks pass; shipped packages have release metadata; feature branch is pushed and an open PR is verified through GitHub.</done>
</task>

</tasks>

## Source coverage audit

| Source | Coverage |
| --- | --- |
| GOAL: all relevant package support | Tasks 1–2 plus final domain/export audit |
| GOAL: docs updated | Task 3 |
| GOAL: isolated worktree | Existing branch/worktree; all tasks stay there |
| GOAL: tests written/updated/passing | Tasks 1–2 behavior tests and task 3 full gates |
| GOAL: PR opened | Task 3 GitHub state verification |
| REQ | Ad-hoc quick task; requirements IDs above track the user goal, not a roadmap phase |
| RESEARCH | Canonical proposal and NIP-5D sources cited above; no separate research artifact |
| CONTEXT | User requests worktree, concise communication, all relevant packages/docs, passing tests, open PR; no deferred scope |

<threat_model>
Catalog crosses a trusted-shell/untrusted-napplet boundary. Mitigate spoofing by using verified manifest metadata in shell adapters, preserving the existing authenticated-source transport, and testing sender filtering. Mitigate information disclosure by filtering whole incomplete/disallowed entries and returning null for unavailable selected handlers. Mitigate privilege escalation by keeping catalog read-only and independent of intent authorization; descriptors never grant domains. Treat display strings as untrusted plain text in examples. Add no dependencies.
</threat_model>

<verification>
Required final evidence: exact branch/head, full build, full type-check, recursive units, npm/JSR exports, applicable lint/static-analysis and pinned quality gate, synced docs, changed-package release metadata, reviewed diff, clean owned tree, and a GitHub PR in OPEN state. If a command fails, fix or establish its cause; do not report completion on partial checks.
</verification>

<output>
Create 261030-pog-SUMMARY.md with test evidence, changed files, simplifications, remaining risks, commits, and PR URL. The orchestrator owns integration, final verification, and completion status.
</output>
