# Resolve PR 292 inline review

Address the five unresolved threads on PR #292 without changing protocol surface.

1. Page each relay independently in live discovery and snapshot refresh. Mark live target batches queried only after every relay finishes; failed or cancelled batches remain retryable. Add unequal-history and failure/retry regressions.
2. Build Napshot fixtures in a unique temporary copy of the web app, including isolated outputs and cache directories. Never replace checkout data. Protect resource startup and cleanup, including partially initialized resources. Test concurrent fixture workspaces and injected setup failures.
3. Execute the fixture browser check in the link-check workflow after all production-site checks; add a workflow ordering assertion.
4. Run targeted regressions, both browser checks, build, type checking, recursive unit tests, and the pinned slop gate. Update docs and GSD state, commit and push on `fix/pr-289-copilot-review`, then reply to and resolve all five threads with verification evidence. The PR is stacked on #289; preserve its base.

The main workspace contains unrelated Soulseek/workspace changes. Work only in the clean PR worktree. No changeset is needed for private website code and test tooling.
