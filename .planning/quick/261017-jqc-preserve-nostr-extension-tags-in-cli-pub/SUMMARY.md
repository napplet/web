---
status: complete
date: 2026-10-17
commit: 9ff56c20
pr: https://github.com/napplet/web/pull/256
---

# Preserve additional Nostr event tags

CLI sidecar loading now retains extra tag names, complete string payloads, relative order, and repeated values. Event content is resolved separately from extra description tags. Current manifests retain historical-looking extension names without invoking legacy conversion. Publishing, snapshots, signing, and current/legacy migration have regression coverage. CLI-managed publication fields and explicit config precedence retain their existing behavior.

Conformance already allowed extra tags; validator and runner regressions preserve that behavior and confirm extras cannot hide invalid required or optional fields. The current NIP-5D Source clause now governs optional source tag validation, including HTTP(S), SSH, Git, and scp-like locations. Invalid icon metadata retains its specified advisory/fallback behavior. Canonical sources were read at implementation time: NIP-5D PR 2303 head 5560820fa4f37f45b8ab742a11aeb3001b17dc67 and NIP-01. The living proposals remain authoritative.

The new preservation regressions failed before implementation. Focused verification passed 47 CLI tests and 51 conformance tests. Full build (all five QuickJS release targets), type checks, recursive unit tests, workflow contracts, and JSR export checks passed. The CLI suite passed 213 tests with three pre-existing ignored cases. Native macOS ARM64 QuickJS dry runs produced eight signed current/legacy root, named, and companion snapshot events with intact extensions and valid signatures; the four current events also passed manifest conformance.

AI-slop 0.12.0 passes the workflow threshold at 95/100 with no findings in changed files. Existing diagnostics are renderDeployReport length, runtimePrelude nesting, and the existing fflate dependency advisory. No rules or dependencies changed. Local evidence logs use the /tmp/napplet-event-tags-* prefix.

CLI/conformance documentation and patch changesets ship with the implementation. The HTTP(S)-only metadata.source config override remains an existing CLI limitation, explicitly flagged in the PR; it does not restrict sidecar source tags or conformance. Work used fix/preserve-event-tags in an isolated worktree. Original-checkout WIP and PR 248 remain untouched. Implementation commit: 9ff56c20. Open PR: https://github.com/napplet/web/pull/256.
