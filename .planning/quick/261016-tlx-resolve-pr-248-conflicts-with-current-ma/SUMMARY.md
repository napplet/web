---
status: complete
commit: 791cfd50
pr: https://github.com/napplet/web/pull/248
---

# Resolve PR 248 conflicts

Merged current main at `67d0e814` into the existing PR branch without rewriting history. Resolved conflicts in CLI dispatch and flag parsing. The integration retains grouped help, colors, filled progress bars, shared prompt policy, YAML migration and exact backups, QuickJS dependency pruning, and released package versions.

Migration now runs before config-consuming command side effects, after command-specific help, and uses the invocation's prompt policy. Editable Zapstore recovery and signer-only persistence use YAML document storage, preserving comments and unsaved deployment overrides. Updated the terminal proof harness and its fixtures for YAML. Added regression coverage for invocation-scoped migration consent and command help before migration.

## Verification

- `pnpm build`: all 12 tasks passed, including all five QuickJS/pruned release binaries.
- `pnpm type-check`: all 18 tasks passed.
- `pnpm -r test:unit`: passed; CLI has 232 passing tests, with three opt-in integrations skipped by default.
- Focused migration, deploy configuration, interaction, and terminal tests: 32 passed.
- Workflow contracts: eight passed. Skills contracts: eleven passed. Onboarding contracts: five passed.
- Tutorial build/conformance and JSR export checks: passed.
- Assembled SPA/docs crawl: 25 URLs, no broken internal links.
- Actual compiled QuickJS terminal proof: passed, including guided configuration, two loopback uploads, relay publication, hidden signing input, filled progress bars, CI, -i, JSON, no-color, and cancellation.
- Additional compiled-binary PTY checks: n/Enter leave legacy JSON untouched and exit 1; y creates YAML and the exact backup; TTY stdin with redirected stdout does not prompt. Completing missing Zapstore metadata in YAML preserves comments, and cancelling the following init wizard exits 130.
- Standalone integration: two passed with an empty host-tool PATH and a fresh private cache. The first run hit a transient hosted-template fetch failure; after verifying the endpoint was reachable, the rerun passed the full suite without source changes.
- AI-slop 0.12.0: 97/100, zero errors. Existing conformance nesting and pinned fflate advisory remain; no rules or threshold changed.
- No remaining unmerged index entries or conflict markers. Generated Deno package/lockfile rewrites were excluded; the committed versions match main.

The original checkout's unrelated WIP is untouched. No PR merge or publication is included.
