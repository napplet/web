---
phase: quick-261104-kdn
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [QUICK-261104-KDN]
files_modified:
  # Conflicted, source and manifests (Task 1)
  - packages/conformance/src/run/boot.ts
  - packages/conformance/src/shell/reference-handler.ts
  - packages/conformance/src/shell/reference-shell.ts
  - packages/conformance/src/validators/envelope-validation.ts
  - packages/conformance/src/validators/envelope.test.ts
  - packages/core/src/envelope.ts
  - packages/core/src/index.ts
  - packages/core/src/types/global.ts
  - packages/nap/jsr.json
  - packages/nap/package.json
  - packages/nap/tsup.config.ts
  - packages/sdk/jsr.json
  - packages/sdk/package.json
  - packages/sdk/src/index.ts
  - packages/sdk/src/nap-runtime.ts
  - packages/sdk/src/nap-types.ts
  - packages/sdk/tsup.config.ts
  - packages/vite-plugin/src/requirements.test.ts
  # Not conflicted, but the merge breaks without it (Task 1)
  - packages/core/src/nap-catalog.ts
  # Conflicted, docs and planning (Task 2)
  - .planning/STATE.md
  - README.md
  - apps/docs/.vitepress/config.ts
  - apps/docs/naps/index.md
  - apps/docs/packages/conformance.md
  - apps/docs/packages/core.md
  - apps/docs/packages/nap.md
  - apps/docs/packages/sdk.md
  - apps/docs/packages/shim.md
  - packages/conformance/README.md
  - packages/core/README.md
  - packages/nap/README.md
  - packages/sdk/README.md
  - packages/shim/README.md
  - packages/vite-plugin/README.md
  - skills/napplet-build/SKILL.md
  - skills/napplet-sdk/SKILL.md
  - skills/napplet-test/SKILL.md
  # Not conflicted, but stale or failing after the merge without it (Task 2)
  - scripts/lib/nap-maturity-docs.ts
  - apps/docs/naps/intent.md
  # Post-merge composition (Task 3)
  - packages/conformance/src/shell/reference-endpoints.ts
  - packages/conformance/src/shell/reference-navigation.test.ts
  - packages/conformance/src/shell/reference-shell.test.ts
  - .changeset/intent-navigation-history.md

estimate:
  tokens: 110000
  raw_tokens: 110000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "merge/pr-280 carries one merge commit whose parents are the PR head line (c325cfa9) and the origin/main tip, with no rebase, force, or rewritten history"
    - "No path is unmerged and no tracked file contains conflict markers"
    - "A napplet calling window.napplet.navigation round-trips against its host-verified manifest in an opaque iframe, over the napplet.hello MessagePort that main requires"
    - "navigation and llm are both registered everywhere domains are registered: NapDomain, NAP_DOMAINS, NAP_IMPLEMENTATIONS, package exports, JSR exports, tsup entries, SDK barrels, docs groups"
    - "navigation is classified exploratory, so selectNapDomains leaves it out by default and a named opt-in admits it"
    - "A host domain ceiling and a binding revocation both end navigation and intent authority for an endpoint"
    - "pnpm build, pnpm type-check, pnpm -r test:unit pass and the aislop scan stays at its 98/100 baseline"
    - "The drift between the PR's IntentDelivery.id / null sender surface and the current NAP-INTENT and NAP-NAVIGATION heads is recorded in the SUMMARY, not silently kept and not silently changed"
  artifacts:
    - path: packages/core/src/nap-catalog.ts
      provides: "navigation maturity entry required by Record<NapDomain, NapImplementationMetadata>"
      contains: "navigation:"
    - path: packages/conformance/src/run/boot.ts
      provides: "Verified-manifest endpoint carried over main's port binding"
      contains: "shell.handleFrom(endpoint, envelope)"
    - path: packages/conformance/src/shell/reference-shell.ts
      provides: "Endpoint registry, navigation, port-binding exports, and a single reset()"
      contains: "createEndpointRegistry"
    - path: scripts/lib/nap-maturity-docs.ts
      provides: "navigation entry in NAP_DOC_GROUPS, driving the docs sidebar and index"
      contains: "navigation:"
    - path: apps/docs/naps/intent.md
      provides: "PR's intent delivery guidance, moved to the per-domain page main created"
      contains: "{ id, sender"
  key_links:
    - from: packages/conformance/src/run/boot.ts
      to: packages/conformance/src/shell/port-binding.ts
      via: "bindNappletPort onMessage calling shell.handleFrom with the verified endpoint"
      pattern: "handleFrom\\(endpoint, envelope\\)"
    - from: packages/conformance/src/shell/reference-shell.ts
      to: packages/conformance/src/shell/reference-endpoints.ts
      via: "createEndpointRegistry receives options.domains as the host ceiling"
      pattern: "createEndpointRegistry\\("
    - from: apps/docs/.vitepress/config.ts
      to: scripts/lib/nap-maturity-docs.ts
      via: "sidebar derived from NAP_DOC_GROUPS, so navigation reaches the sidebar through the group entry"
      pattern: "NAP_DOC_GROUPS"
---

<objective>
Merge origin/main into `merge/pr-280` (PR napplet/web#280, `feat/nap-navigation`) with a plain merge commit, keep both sides' intent, and fit navigation into the structures main introduced since merge base f6839146.

Purpose: PR #280 reports CONFLICTING against main. Main has moved 36 commits, and several of them change contracts navigation sits on (port-bound identity, the maturity catalog, per-domain docs). A text-only resolution would compile in places and still be wrong.

Output: One merge commit, one follow-up commit composing main's host ceiling and revocation with navigation endpoints, and a SUMMARY recording the spec drift below. Nothing is pushed.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@packages/conformance/src/shell/reference-endpoints.ts
@packages/conformance/src/shell/reference-navigation.ts

**Where to work.** Every command runs in `/Users/sandwich/.worktrees/napplet/pr-280-merge` on branch `merge/pr-280`. Do not work in `/Users/sandwich/Develop/napplet` (a different branch) or touch `~/.worktrees/napplet/nap-navigation` (a superseded planning line).

**Scope.** Keep both sides' intent. Add no features, fix nothing unrelated, and change PR behavior only where the merge requires it. Versions and CHANGELOGs come from main. Keep the PR's unreleased changeset. Do not run `pnpm version-packages`, do not push, and do not edit the PR.

**Known spec drift: flag it, do not fix it here.** PR #280 was built against napplet/naps#126 at `778f0dc1` and #128 at `65252428`. Both drafts have moved, and the current heads contradict surface the PR ships:

- NAP-INTENT at `74f9bf85`: "No intent delivery identifier is exposed", "`intent.deliver` is a runtime push and has no request or delivery id", and for selected-instance delivery the `sender` "MUST be the target's own catalog identifier. The runtime MUST NOT fabricate, reserve, or null a sender for this purpose."
- NAP-NAVIGATION at `9a4b179e`: revisits now settle by location ("Settle revisits by location instead of delivery ids"), and "navigation adds no fields to the intent payload or delivery".

The PR's required `IntentDelivery.id`, nullable `sender`, and delivery-id-keyed `retryIntent` / `failNavigationDelivery` therefore implement a superseded revision. Reconciling them is a separate change and outside this merge. Carry that surface through unchanged and write no new text claiming it matches the current drafts. Task 3 records the drift in the SUMMARY. If resolving a conflict forces a wire-behavior choice not settled by either side, read the draft at its current head (`gh pr view 126 --repo napplet/naps` and 128), and flag it in the SUMMARY rather than invent an answer.

**Merge resolution rules, for every file.**

- Transport and identity: main wins (`napplet.hello` MessagePort, port binding, revocation).
- Domain lists: union, with `navigation` directly after `intent` and main's `llm` position kept.
- Registries and exports: union. Neither side's entry may disappear (protocol-fidelity rule 9).
- Versions, badges, CHANGELOGs: main.
- PR-only navigation and intent-delivery prose: keep it, restructured to main's layout.
- Prose stays non-normative and defers to the living drafts. No new MUST text, and no manual hard-wrapping (AGENTS.md).

**A single uncommitted merge spans Tasks 1 and 2.** Git cannot record a partial merge, so no commit happens until Task 2 ends. Do not run any merge abort, hard reset, stash, or checkout of a path during those tasks. Finish both in one sitting.
</context>

<tasks>

<task type="tracer">
  <name>Task 1: Start the merge, resolve packages, and prove one navigation path end to end</name>
  <files>packages/nap/package.json, packages/nap/jsr.json, packages/nap/tsup.config.ts, packages/sdk/package.json, packages/sdk/jsr.json, packages/sdk/tsup.config.ts, packages/sdk/src/index.ts, packages/sdk/src/nap-runtime.ts, packages/sdk/src/nap-types.ts, packages/core/src/envelope.ts, packages/core/src/index.ts, packages/core/src/types/global.ts, packages/core/src/nap-catalog.ts, packages/vite-plugin/src/requirements.test.ts, packages/conformance/src/validators/envelope-validation.ts, packages/conformance/src/validators/envelope.test.ts, packages/conformance/src/shell/reference-handler.ts, packages/conformance/src/shell/reference-shell.ts, packages/conformance/src/run/boot.ts</files>
  <precondition>`git merge-base --is-ancestor c325cfa9 HEAD` succeeds on branch merge/pr-280 and tracked files are clean.</precondition>
  <action>
A merge resolution is indivisible, so the usual per-task file limit does not apply. Most of these files are mechanical unions; boot.ts, reference-shell.ts, and reference-handler.ts need thought.

1. Start the merge. Run `git fetch origin main`, then `git merge --no-commit --no-ff origin/main`. A conflict exit is expected. Compare `git diff --name-only --diff-filter=U` with the 36 paths in this plan's conflicted lists. If main moved past f28c2fdd and the list differs, apply the same rules and note the tip and extra paths in the SUMMARY.

2. Manifests first, because pnpm cannot read conflicted JSON. In `packages/nap/package.json` and `packages/sdk/package.json` take main's version, union the description's domain list, and keep both the `./navigation*` and `./llm*` export blocks. The hunks end inside an object, so add the closing brace and comma between blocks. `packages/nap/jsr.json` and `packages/sdk/jsr.json` get the same export union. Confirm each parses with `node -e "JSON.parse(require('fs').readFileSync(process.argv[1]))"`. Then run `pnpm install --frozen-lockfile`. If the lockfile is rejected, find out why before running a non-frozen install, and stage `pnpm-lock.yaml` only if the merge really changes the dependency set.

3. Core. In `packages/core/src/envelope.ts` take main's `NapDomain` union and `NAP_DOMAINS` array and insert `navigation` directly after `intent`. `packages/core/src/index.ts` and `packages/core/src/types/global.ts` keep both the navigation and llm lines; check that both `navigation?` and `llm?` members survive on the global type.

4. Add the catalog entry to `packages/core/src/nap-catalog.ts` directly after `intent`. Main types the catalog as `Readonly<Record<NapDomain, NapImplementationMetadata>>`, and a test requires its keys to equal `NAP_DOMAINS`, so the merge does not type-check without it. Use proposal url `https://github.com/napplet/naps/pull/126`, status `in-review`, checkedAt `2026-11-04`, maturity `exploratory`. The status is `in-review` because `scripts/refresh-nap-maturity.mjs` maps a non-draft open pull request to that value and #126 reports `isDraft: false`; the spec's own `draft` label is a different field, and using it here would be flipped by the next refresh. Rationale: "Binding and reference-runtime tests cover an earlier published draft revision; later upstream changes are not yet reconciled, so the API remains exploratory." Evidence: `packages/nap/src/navigation/shim.test.ts` and `packages/conformance/src/shell/reference-navigation.test.ts`. Omit `implementationReference`, which is reserved for a verified revision. Do not hand-edit `scripts/data/nap-proposal-observations.json`: the scheduled refresh records a first observation for new domains, and seeding the current head would hide the drift this plan flags.

5. NAP and SDK. `packages/nap/tsup.config.ts` keeps the `navigation/*` entries, main's `boundary` entry, and the `llm/*` entries. `packages/sdk/tsup.config.ts` entry becomes index, gamepad, navigation, llm. `packages/sdk/src/index.ts`, `nap-runtime.ts`, and `nap-types.ts` keep both blocks.

6. `packages/vite-plugin/src/requirements.test.ts`: keep both describe blocks whole. The hunk splits inside each block, so make sure each has its own closing braces and neither absorbs the other's tests.

7. Conformance validators. `packages/conformance/src/validators/envelope-validation.ts` keeps both imports and both blocks (navigation checks and `validateLlmRequest`). In `envelope.test.ts` the expected counts add both sides' growth on merge base 243/117/126: main is 252/121/131 and navigation adds 4 discriminants (2 outbound, 2 inbound), giving 256 split 123 outbound and 133 inbound. If main has moved, add 4/2/2 to main's current numbers.

8. `packages/conformance/src/shell/reference-handler.ts`. Keep the PR's `navigation.report` / `navigation.get` branch first, unchanged, because it answers invalid reports with a `NavigationResult` and must run ahead of the verdict check. Then use main's lines: `if (!type) return [];`, the `candidates` / `hostDomains` filter, and main's later `llmInvalidRequest` handling. Drop the PR's combined `!type || !verdict.ok` line, which would break main's correlated invalid-request answers for LLM. Keep the `navigation` handler option alongside main's `domains`.

9. `packages/conformance/src/shell/reference-shell.ts`. Union the imports and keep main's `bindNappletPort` and `NAPPLET_HELLO` re-exports. Build `endpoints`, `intents` with the PR's four-argument `createIntentHandlers(deliveries.queue, endpoints, options.manifests, options.defaults)`, and `navigation` as on the PR side. Name the inner function `handler` and pass it main's `domains: options.domains` plus the PR's `intents` and `navigation`. Keep the PR's `handleFrom` wrapper that registers the endpoint first. The merged object has two `reset` definitions; reduce them to one that clears records, calls `handler.reset()`, clears deliveries, and calls `navigation.clearPending()`. Keep `registerEndpoint`, `deliverIntent`, and the other PR controls.

10. `packages/conformance/src/run/boot.ts`. Union the imports (`selectNapDomains`, `NapDomain`, `NapMaturityPolicy`, `REFERENCE_ENDPOINT`, `catalogId`, `CatalogManifest`, `NappletManifestEvent`, `bindNappletPort`, `TransportViolation`). The `bootOnce` options type requires `runtimePreludeSource` as on main (fallback runtime removed in #286) and adds `verifiedManifest` to the optional picks. Use `createReferenceShell({ domains })`, then the PR's manifest guard and `endpoint` construction. Drop the PR's window-listener fragment, since main replaced that path with port binding and internal probes. End the boot with `binding.detach()`, `shell.terminateEndpoint(endpoint.id)`, then `removeFrame()`.

11. Easy to miss because it is not in a conflict hunk: main's `bindNappletPort` call in boot.ts reads `onMessage: (envelope) => shell.handle(envelope)`. Change it to `shell.handleFrom(endpoint, envelope)`. Otherwise the subject runs as the default reference endpoint, the verified manifest is lost, and the host-bound navigation round trip fails.

12. If Playwright reports Chromium is missing, run `pnpm --filter @napplet/conformance-cli exec playwright install chromium` and rerun. Do not commit yet. Docs conflicts are Task 2, so build only the packages here.
  </action>
  <verify>
    <automated>pnpm exec turbo run build type-check --filter=@napplet/conformance-cli... && pnpm --filter @napplet/conformance-cli exec vitest run src/browser.test.ts -t "round-trips navigation" && pnpm --filter @napplet/conformance exec vitest run src/shell src/validators src/run && pnpm --filter @napplet/core exec vitest run src/nap-maturity.test.ts</automated>
  </verify>
  <done>The merge is still in progress with only docs and planning paths unresolved. The browser test proves navigation.get and navigation.report through the nap shim, injected runtime, hello port, reference handler, and history against a host-bound manifest in an opaque iframe. Conformance and catalog tests pass, including llm's.</done>
</task>

<task type="auto">
  <name>Task 2: Resolve docs, skills and STATE, fit navigation into main's docs structure, and conclude the merge</name>
  <files>README.md, apps/docs/.vitepress/config.ts, apps/docs/naps/index.md, apps/docs/naps/intent.md, apps/docs/packages/conformance.md, apps/docs/packages/core.md, apps/docs/packages/nap.md, apps/docs/packages/sdk.md, apps/docs/packages/shim.md, packages/conformance/README.md, packages/core/README.md, packages/nap/README.md, packages/sdk/README.md, packages/shim/README.md, packages/vite-plugin/README.md, skills/napplet-build/SKILL.md, skills/napplet-sdk/SKILL.md, skills/napplet-test/SKILL.md, .planning/STATE.md, scripts/lib/nap-maturity-docs.ts</files>
  <action>
1. `apps/docs/.vitepress/config.ts`: take main's `sidebar` variable and drop the PR's literal sidebar. Main derives the NAP section from `NAP_DOC_GROUPS`, so navigation reaches it through step 2.

2. `scripts/lib/nap-maturity-docs.ts`: add `navigation` to the "Napplet to napplet" group directly after `intent`, because the domain requires INTENT. Purpose text: "Runtime-maintained history of committed intent locations." `apps/web/src/lib/nap-maturity.test.ts` requires every catalog domain to have exactly one grouped page, so this is required by the merge, not optional polish.

3. `apps/docs/naps/index.md`: take main's structure with its maturity-table marker and generated index. Main moved the per-domain sections out of this page in #299, so drop the PR side's copied sections. Keep only the PR's `navigation` addition, inserted in the Core domain union sentence next to main's `llm`.

4. Do not lose the PR's content from that page. Read `git diff f6839146 c325cfa9 -- apps/docs/naps/index.md`. Its intent paragraph and its `intent.onDelivery(({ id, sender, convention, payload })` sample now belong in `apps/docs/naps/intent.md`, which main created from the older text and which auto-merged without them. Port those two changes there, in the PR's wording. The PR's navigation blurb is already covered by `apps/docs/naps/navigation.md`, which stays as is.

5. The remaining READMEs, `apps/docs/packages/*.md`, and `skills/*/SKILL.md`: apply the merge resolution rules from the context section. Keep main's maturity, opt-in, port-binding, and LLM sections. Keep the PR's navigation sections, navigation rows in API tables, and intent delivery wording. Where the PR describes window-level or `event.source` authentication and main describes the hello port, use main's description. Domain lists get the union.

6. `.planning/STATE.md`: take main's `last_activity_desc` and keep both sides' quick-task rows, placing the `261030-pnj` row by date among main's rows. Leave this task's own STATE row to the orchestrator.

7. Reread the resolved docs for damage a marker check cannot see: a section present twice, a heading left with no body, or a domain list missing either `navigation` or `llm`. Fix what you find.

8. Run the verify gates. If a gate fails from something the merge did not touch, confirm it reproduces on origin/main and report it in the SUMMARY rather than fixing it.

9. Conclude the merge. Stage each resolved path explicitly with `git add`, plus `packages/core/src/nap-catalog.ts`, `scripts/lib/nap-maturity-docs.ts`, and `apps/docs/naps/intent.md`. Do not stage `deno.lock` side effects, this plan, or the SUMMARY. Confirm with `git status --short`, then run `git commit` with subject `chore: merge origin/main into feat/nap-navigation` and a body naming the semantic fits (catalog entry, docs group, intent page, verified endpoint over the hello port), ending with the repo's `Co-Authored-By` trailer. Check that `git log -1 --format=%P` shows two parents.
  </action>
  <verify>
    <automated>test -z "$(git diff --name-only --diff-filter=U)" && ! git grep -nE '^[<>]{7} ' && pnpm --dir apps/web exec vitest run src/lib/nap-maturity.test.ts && pnpm build && pnpm type-check && pnpm -r test:unit</automated>
  </verify>
  <done>A two-parent merge commit exists on merge/pr-280 and is green on build, type-check, and unit tests. Navigation appears in the docs sidebar and grouped index with a maturity label on its page. The PR's intent delivery guidance lives on `apps/docs/naps/intent.md`.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Compose host ceiling and revocation with navigation endpoints, run all gates, and record the drift</name>
  <files>packages/conformance/src/shell/reference-endpoints.ts, packages/conformance/src/shell/reference-shell.ts, packages/conformance/src/run/boot.ts, packages/conformance/src/shell/reference-navigation.test.ts, packages/conformance/src/shell/reference-shell.test.ts, .changeset/intent-navigation-history.md</files>
  <behavior>
    - With `createReferenceShell({ domains: ['storage'] })`, `navigation.get` from an endpoint that declares no domains returns a result with `ok: false` and error code `denied`, and `shell.deliverIntent` for that endpoint returns undefined.
    - With a ceiling that includes navigation and intent, the same endpoint reports and reads history as it does today.
    - After `attachReferenceShell` revokes a binding, the host's `onRevoke` runs once, the endpoint's retained history is gone, and `shell.registerEndpoint` for that id returns false.
    - `binding.detach()` alone does not terminate the endpoint, because it is host teardown and not a revocation.
  </behavior>
  <action>
These gaps exist only because the two sides now meet, and existing tests cannot see them. Commit them separately from the merge so reviewers can read them on their own.

1. Write the behavior tests first and confirm they fail. Ceiling cases go in `packages/conformance/src/shell/reference-navigation.test.ts` using its endpoint fixture. Revocation cases go in `packages/conformance/src/shell/reference-shell.test.ts` using the fake host in its `attachReferenceShell` describe block.

2. Host ceiling. Main's `ReferenceShellOptions.domains` is documented as the host domain ceiling, but `hasDomain` in `packages/conformance/src/shell/reference-endpoints.ts` reads only the endpoint's own domains, and the PR's navigation branch intentionally runs ahead of the handler's domain filter. A host with a narrow ceiling would therefore still serve history and deliver intents. Give `createEndpointRegistry` an optional second parameter for the host domains, and have `hasDomain` require membership in both sets. Pass `options.domains` from `createReferenceShell`. Nothing changes when the option is omitted.

3. Revocation. NAP-NAVIGATION at `9a4b179e` says endpoint termination ends live navigation authority and a new instance starts unreported, and NIP-5D revokes the port when the frame's document is replaced. In `packages/conformance/src/run/boot.ts` make `onRevoke` call `shell.terminateEndpoint(endpoint.id)` and then `removeFrame()`. In `attachReferenceShell` wrap `options.onRevoke` so the shell terminates `options.endpoint?.id ?? REFERENCE_ENDPOINT.id` first. `terminateEndpoint` is already safe to call twice. Leave `detach()` as host teardown.

4. Changeset. Add one sentence to `.changeset/intent-navigation-history.md`: navigation is cataloged as exploratory, so hosts using `selectNapDomains` need a named opt-in. Leave the frontmatter bump levels alone. Leave the existing "follow the published drafts" sentence as is and record its staleness in the SUMMARY, since rewording it is part of the separate reconciliation.

5. Commit `fix(conformance): apply host ceiling and revocation to navigation endpoints`, staging only this task's paths, with the `Co-Authored-By` trailer.

6. Run the full gates in verify. Read the aislop score from its output: it must be 98/100 with only the `deepmerge` finding, and `.aislop/config.yml` stays unchanged. If `pnpm test:conformance` cannot launch a browser after installing Chromium, say so plainly in the SUMMARY. If running deno dirtied `deno.lock`, leave it unstaged and mention it.

7. Write the SUMMARY with a `## Spec drift` section containing: the implemented heads (`778f0dc1`, `65252428`), the current heads re-read with `gh pr view 126 --repo napplet/naps --json headRefOid` and the same for 128, the quoted clauses from this plan's context, the PR surface affected (`IntentDelivery.id`, null `sender`, `retryIntent`, `failNavigationDelivery`, and the changeset and docs that describe them), and a plain statement that this merge did not reconcile them. Also list the stale claim in the PR body that #128 is closed. It is open, and the orchestrator owns the PR body.
  </action>
  <verify>
    <automated>pnpm build && pnpm type-check && pnpm -r test:unit && pnpm check:jsr && pnpm test:nap-maturity && pnpm test:skills-contracts && pnpm test:conformance && npx -y aislop@0.12.0 scan . && ! git grep -nE '^[<>]{7} ' && git merge-base --is-ancestor c325cfa9 HEAD && git merge-base --is-ancestor origin/main HEAD</automated>
  </verify>
  <done>The new tests went red then green. Every gate passes, aislop reads 98/100 with only `deepmerge`, and both c325cfa9 and origin/main are ancestors of HEAD, so a non-force push will fast-forward `feat/nap-navigation`. The SUMMARY's `## Spec drift` section states what remains unreconciled. Nothing has been pushed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| napplet frame to reference shell | Untrusted envelopes cross here; identity is established by the `napplet.hello` port binding |
| host policy to reference shell | The host's domain ceiling and verified manifest decide what an endpoint may do |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-kdn-01 | Spoofing | `packages/conformance/src/run/boot.ts` | high | mitigate | Drop the PR's window-listener path during resolution, so traffic reaches the shell only through `bindNappletPort` as main requires; `src/run` tests and the browser test cover it |
| T-kdn-02 | Elevation of Privilege | `hasDomain` in `reference-endpoints.ts` | medium | mitigate | Intersect endpoint domains with the host ceiling in Task 3, so a domain the host withheld cannot serve history or receive intents; covered by new tests |
| T-kdn-03 | Information Disclosure | `onRevoke` in `boot.ts` and `attachReferenceShell` | medium | mitigate | Terminate the endpoint on revocation in Task 3, so a replaced document cannot inherit the prior document's history or deliveries; covered by new tests |
| T-kdn-04 | Tampering | Conflict resolution over main's security fixes (#302, #304, #305, #316) | high | mitigate | Main wins on transport and identity by rule; #316's correlated LLM answers stay intact in the handler; the full unit suite runs before the merge commit |
| T-kdn-05 | Repudiation | Shipped metadata claiming spec conformance | medium | mitigate | Catalog rationale says the implementation covers an earlier revision, and the SUMMARY records the drift explicitly |
| T-kdn-SC | Tampering | Package installs | low | accept | The merge adds no dependency; `pnpm install --frozen-lockfile` installs exactly what the merged lockfile pins |
</threat_model>

<verification>
Source coverage, mapping each item in the planning brief to where it is handled:

| Source item | Task |
|-------------|------|
| Merge conflicts in 36 paths | 1 (source, manifests), 2 (docs, skills, STATE) |
| #302 identity bound to the hello port | 1 (boot.ts, reference-shell.ts), 2 (prose), 3 (revocation) |
| #288 maturity metadata and opt-in | 1 (catalog entry), 2 (docs group), 3 (ceiling, changeset) |
| #284 / #314 NAP-LLM in the same registries | 1 (unions), 2 (prose) |
| #299 one docs page per domain | 2 (sidebar, group, index, intent page) |
| #286 maintained prelude required | 1 (bootOnce option types) |
| #316 correlated LLM invalid-request | 1 (handler ordering) |
| Reference runtime bindings (`run/bindings.test.ts`) | 1 and 2 (test runs) |
| Canonical-draft check, flag not invent | Context section and Task 3 SUMMARY |
| No force or rewrite, executor does not push | Tasks 2 and 3 (ancestry checks) |
| `deno.lock` side effects stay out | Tasks 2 and 3 |

Overall, after Task 3: a two-parent merge commit exists, build, type-check, unit tests, and the aislop baseline are green, and no conflict markers remain.
</verification>

<success_criteria>
- `git log --merges -1` on merge/pr-280 shows parents from the PR line and origin/main, with c325cfa9 still an ancestor.
- `pnpm build`, `pnpm type-check`, `pnpm -r test:unit`, `pnpm check:jsr`, `pnpm test:nap-maturity`, `pnpm test:skills-contracts`, and `pnpm test:conformance` pass, or a browser limitation is stated plainly.
- aislop reads 98/100 with only `deepmerge`.
- Both `navigation` and `llm` are importable from `@napplet/sdk/<domain>` and `@napplet/nap/<domain>` and appear in the catalog and docs index.
- The SUMMARY contains a `## Spec drift` section naming the unreconciled surface and the current draft heads.
- Nothing is pushed, and the PR body is unchanged.
</success_criteria>

<output>
Create `.planning/quick/261104-kdn-resolve-pr-280-merge-conflicts-with-main/261104-kdn-SUMMARY.md` when done.
</output>
