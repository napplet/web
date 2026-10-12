---
status: resolved
trigger: "Add --version, -v, or version to identify the running CLI; newest JSR install reportedly publishes old event schema."
created: 2026-10-09
updated: 2026-10-09
---

# CLI version visibility

## Evidence

- The CLI dispatcher has no version flag or command.
- JSR metadata currently lists 0.8.0 as latest; its published manifest-format selector defaults to current, including non-interactive deployments.
- Local main contains version 0.8.1. That difference alone does not explain legacy event output: current event support predates both releases.
- The user's exact install/deploy commands and resolved executable path are pending; no schema defect has been reproduced.

## Current Focus

Add all three version aliases using package metadata embedded by imports, cover dispatch and standalone output, and document version/path checks. Investigate published JSR behavior without broadcasting events. Ship separately from installer PR #231.

## Resolution

Added `--version`, `-v`, and `version` in the shared dispatcher. The version comes from a static deno.json import, so JSR and compiled binaries embed their own package version without runtime file or network lookups. Added permission-restricted dispatcher tests for every alias, documented version/path checks and JSR refresh flags, and prepared CLI 0.8.2 with `pnpm version-packages`.

Published JSR 0.8.0 was tested directly against a temporary single-file app with `deploy --dry-run --json`. It emitted format current, kind 35129, one direct artifact hash in x, and description content, matching the canonical NIP-5D Manifest section at https://github.com/nostr-protocol/nips/pull/2303 (reviewed head 020cb8b33a9e4c6b8ca4b2f9d0ed0a67843b68f7). No events were broadcast and no schema changes were made.

The shared environment resolves the standalone executable before the Deno shim; the Deno installation lock selects 0.7.0. Deno 2.9.5 also rejects an exact 0.8.0 fetch under its default 24-hour dependency-age policy at investigation time; the isolated 0.8.0 probe explicitly allowed that release. These observations explain why a newly run install command alone does not establish the executable/version used, but do not establish the cause of the user's old-schema event. The exact event/deploy invocation was not supplied, so that symptom remains unconfirmed.

Verification: all three aliases in the native standalone binary; 156 CLI tests; complete build/type-check/unit gates; docs build; JSR publish dry-run (no publication); release-tooling checks; diff checks; changed-file AI-slop 100/100. Version bump checks rerun after generating release metadata. Only native macOS ARM64 binaries were executed; all five release targets compiled.
