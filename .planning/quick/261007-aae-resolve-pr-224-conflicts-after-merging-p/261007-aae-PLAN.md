---
quick_id: 261007-aae
status: planned
---

# Resolve PR #224 conflicts with #223

1. Merge origin/main into the existing PR branch, preserving #223's explicit-domain retention and advisory warnings while adapting its tests and docs to #224's current R/O event schema. Preserve current/legacy CLI behavior and the prior review fixes.
2. Verify build, type-check, unit tests, relevant contract checks, and AI-slop gate. Check that no conflict markers or obsolete current-schema requirements remain. Keep declarations separate from runtime support; consult the live NIP-5D Manifest section for protocol requirements.
3. Record verification, commit the integration, push the existing PR branch, and confirm GitHub reports PR #224 mergeable against main.

Work occurs in the clean napplet-event-schema worktree. Unrelated main-worktree changes remain untouched. This is a merge of existing package changes; reconcile #223's pending changesets with #224's already-prepared unpublished release entries without losing release notes.
