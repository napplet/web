---
status: resolved
trigger: "curl -fsSL https://napplet.run/install.sh | sh returns 404"
created: 2026-10-09
updated: 2026-10-09
---

# Installer download 404

## Symptoms

The documented installer command fails with curl HTTP 404. It should download and checksum-verify the standalone CLI.

## Evidence

- The public install.sh endpoint returns HTTP 200 and contains the expected shell script.
- Its default release base is github.com/napplet/web/releases/download/napplet-cli; the macOS ARM64 asset returns HTTP 404 there.
- The same asset and SHA256SUMS return HTTP 200 under github.com/napplet/napplet/releases/download/napplet-cli.
- Both source installers and both public copies use the failing base. Existing smoke tests override the base with a fixture, so they never exercise the default URL.
- Unrelated workspace/package configuration edits in the original checkout are preserved; this task uses an isolated worktree from origin/main.

## Current Focus

Implementation and verification complete; open the installer PR before starting the separately requested CLI version-reporting investigation.

## Resolution

Both installers and their served copies now use the working napplet/napplet release URL. The offline smoke test exercises the served shell installer with its default release base, verifies installed fixture bytes, and checks the PowerShell default and copy parity. Site deployment runs the installer tests before building. CLI installation docs link to the stable release. No package output changes, so no changeset is needed.

Verification: regression failed on the old URL and passed after the fix; `pnpm test:installers`, `pnpm test:workflow-contracts`, `pnpm build`, `pnpm type-check`, `pnpm -r test:unit`, shell syntax, and `git diff --check` passed. Changed-file AI-slop scan scored 100/100. Live corrected asset HEAD and checksum GET returned HTTP 200. PowerShell execution was not available; its URL and served-copy parity are covered by assertions.
