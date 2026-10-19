---
status: complete
---

# Resolve PR 248 conflicts with main

1. Bring the existing clean PR worktree to the authoritative remote head and merge current main without rewriting history. Preserve all existing CLI terminal behavior and the merged YAML migration, QuickJS compilation defaults, and released versions.
2. Resolve conflicts at their owning layers. Use the shared interaction policy for migration prompts, preserve legacy refusal and backup behavior, and keep explicit custom config paths, -i, CI, JSON, redirected input, and command passthrough working. Update only tests/docs needed for the integration.
3. Run focused CLI/configuration tests, then build, type checks, recursive unit tests, relevant contract checks, standalone/terminal proof, and the AI-slop gate. Commit the merge and verification artifacts, push the existing PR branch, and verify GitHub reports PR 248 mergeable with no remaining required failures.

Original-checkout package/lockfile WIP is unrelated and remains untouched. Work is in /Users/sandwich/Develop/napplet-cli-usability on feat/cli-terminal-usability. No protocol change or PR merge/publication is requested.
