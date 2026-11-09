---
status: complete
---

# Periodic NAP metadata review

Add this follow-up to PR #288 on its existing branch. Preserve unrelated work in the original worktree. Execute inline through GSD quick.

1. Add a deterministic GitHub-backed updater with a separate observation snapshot. Refresh proposal state and check dates; detect upstream revisions and retirement signals without changing maturity assessments or implementation verification references.
2. Add daily and manual GitHub Actions automation that maintains one review PR, validates changes, and never merges or publishes them. Avoid daily date-only PR churn.
3. Test status transitions, unchanged runs, revision alerts, partial-fetch failure, and preservation of implementation assessments. Document operation, release review, token setup and failure recovery.
4. Run required checks, commit by path, push to PR #288 and verify hosted results.
