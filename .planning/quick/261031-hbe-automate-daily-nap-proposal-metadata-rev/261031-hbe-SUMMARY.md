---
status: complete
verified: 2026-10-31
---

# Scheduled NAP metadata review

Added to the existing PR #288 branch, as requested. The original Soulseek worktree remains untouched.

The daily 05:43 UTC and manual workflow collects all shipped catalog proposals, watches open PR heads and current merged-document blob revisions, refreshes proposal status/date only on observation changes, and maintains one draft PR on chore/nap-proposal-refresh. Closed unmerged proposals, removed documents and definite registry retirement states trigger explicit retirement review. Implementation maturity, rationale, evidence and verified implementation references are preserved. API or collection failures occur before local writes. A committed snapshot contains observed revisions only; it is not compatibility evidence or normative text.

Seven updater tests pass, covering transitions, preservation, unchanged polling, head/document changes, retirement signals, concurrent PR movement, malformed mappings and failure before writes. Workflow contracts pass 15/15. Live collection succeeded for all 26 domains and a second independent live collection with a later check date produced no changes. No shipped core catalog content changed during seeding, so this follow-up does not require another package bump. Future catalog edits automatically include a core patch changeset for the normal reviewed release process.

Required local gates pass: pnpm build (12 tasks), pnpm type-check (19 tasks), pnpm -r test:unit, pnpm test and pnpm test:workflow-contracts. The adjusted core test also passes independently (43 tests). Tutorial conformance has 6 passed, 0 failed, 6 explicitly skipped checks. Evidence logs are /tmp/nap-maturity-evidence/automation-*.log. AI-slop scan 0.12.0 reports 100/100 with zero diagnostics; no rule changes. The initial workflow contract assertion omitted YAML's block scalar marker, was corrected, and the final suite passed.

The workflow starts on the default branch after merge. The repository currently permits workflow PR creation. No NAP_MATURITY_BOT_TOKEN secret is configured: fallback GITHUB_TOKEN can maintain the draft PR but cannot trigger normal PR checks. The job runs build/types/units before creating the PR; maintainers must arrange required PR checks or supply the documented dedicated token. The scheduled workflow itself cannot run from this unmerged branch and has not been claimed as executed. It never merges or publishes. The final PR hosted checks are verified separately before reporting completion.
