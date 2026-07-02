---
status: complete
date: 2026-07-02
quick_id: 260702-jsr
---

# Gate registry publish workflows to Version Packages state

## Result

Updated the JSR publish workflow so push-triggered publishing only runs for
Version Packages merge commits. Manual dispatch remains available for recovery
publishes.

The npm Publish workflow remains functionally unchanged because it must run on
ordinary `main` pushes to let `changesets/action` create or update the generated
Version Packages PR. Its comments now document that the registry publish path is
only expected after the generated release PR is merged.

## Verification

- Confirmed the original JSR failure came from the feature PR merge commit before
  Version Packages updated `packages/sdk/jsr.json` to `@napplet/nap@^0.25.0`.
- Confirmed the later Version Packages run succeeded for both npm Publish and
  Publish to JSR.
- `go run github.com/rhysd/actionlint/cmd/actionlint@latest .github/workflows/publish.yml .github/workflows/publish-jsr.yml`
- `git diff --check`
