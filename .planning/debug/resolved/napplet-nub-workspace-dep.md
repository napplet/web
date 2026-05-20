---
status: resolved
trigger: "GitHub issue #4: @napplet/nub@0.2.1 publishes unresolved workspace:* specifier for @napplet/core"
created: 2026-05-20T12:22:09Z
updated: 2026-05-20T12:26:37Z
---

## Current Focus

hypothesis: CONFIRMED - @napplet/nub used workspace:* and the release script published through changeset publish instead of pnpm publish/pack, allowing the npm tarball to leak the workspace protocol.
test: Regression test, local pnpm pack manifest inspection, workspace type-check, build, root test, and lint.
expecting: @napplet/nub source uses workspace:^; root publish-packages routes through pnpm publish -r; packed manifest rewrites @napplet/core to ^0.2.1; verification exits 0.
next_action: None - resolved. Publish the next version through the normal release flow; the existing 0.2.1 npm artifact cannot be changed.

## Symptoms

expected: Consumers installing @napplet/nub from npm receive a package manifest where dependencies["@napplet/core"] is a real semver range, e.g. "^0.2.1" or a concrete version.
actual: npm view @napplet/nub@0.2.1 dependencies returns { "@napplet/core": "workspace:*" }.
errors: Downstream package managers cannot resolve the transitive @napplet/core edge from the npm registry package.
reproduction: Run npm view @napplet/nub@0.2.1 dependencies --json.
started: Reported in https://github.com/napplet/napplet/issues/4 on 2026-05-20.

## Eliminated

- hypothesis: The local package cannot be packed with resolved workspace protocol dependencies.
  evidence: pnpm -C packages/nub pack --json produced a local tarball whose package/package.json rewrites @napplet/core from workspace:* to "0.2.1".
  timestamp: 2026-05-20T12:22:09Z

## Evidence

- timestamp: 2026-05-20T12:22:09Z
  checked: GitHub issue #4
  found: Issue reports @napplet/nub@0.2.1 published with dependencies["@napplet/core"] equal to "workspace:*"; expected a semver range.
  implication: The broken artifact is already on npm and the fix must target the next publish.

- timestamp: 2026-05-20T12:22:09Z
  checked: npm view @napplet/nub@0.2.1 dependencies --json
  found: { "@napplet/core": "workspace:*" }
  implication: The registry still carries the unresolved transitive edge.

- timestamp: 2026-05-20T12:22:09Z
  checked: packages/nub/package.json
  found: dependencies["@napplet/core"] is "workspace:*".
  implication: If any publish path bypasses pnpm pack/publish rewrite, this exact unresolved value can leak again.

- timestamp: 2026-05-20T12:22:09Z
  checked: package.json publish-packages script and .github/workflows/publish.yml
  found: The workflow delegates to npm script publish-packages, which currently runs "turbo run build && changeset publish".
  implication: The release path does not explicitly use pnpm publish -r, the tool documented to rewrite workspace protocol specs during packing/publishing.

- timestamp: 2026-05-20T12:23:24Z
  checked: pnpm vitest run packages/nub/src/publish-manifest.test.ts before the fix
  found: 2 failures - expected workspace:^ but received workspace:*; expected publish script to contain "pnpm publish -r" but received "turbo run build && changeset publish".
  implication: The regression test reproduced both root-cause conditions.

- timestamp: 2026-05-20T12:23:24Z
  checked: pnpm vitest run packages/nub/src/publish-manifest.test.ts after the fix
  found: 2 tests passed.
  implication: @napplet/nub metadata and the release script now match the guarded publish contract.

- timestamp: 2026-05-20T12:24:00Z
  checked: pnpm -C packages/nub pack --pack-destination /tmp --json plus tar manifest inspection
  found: package/package.json contains dependencies["@napplet/core"] = "^0.2.1" and no workspace protocol for that edge.
  implication: pnpm's pack path now emits the semver range expected by issue #4.

- timestamp: 2026-05-20T12:25:30Z
  checked: pnpm --filter @napplet/nub test:unit
  found: 5 test files passed, 56 tests passed.
  implication: Existing @napplet/nub tests and the new publish-manifest regression are wired into the package's test task.

- timestamp: 2026-05-20T12:26:37Z
  checked: pnpm type-check, pnpm build, pnpm test, pnpm lint
  found: type-check passed 16/16 tasks; build passed 14/14 tasks; root test passed 18/18 tasks with @napplet/nub 56/56 tests included; lint exited 0 with no configured lint tasks.
  implication: Workspace verification is green; lint has no package tasks to execute in this repo.

## Resolution

root_cause: @napplet/nub's source manifest used "workspace:*" for @napplet/core, and the configured release script used "changeset publish" rather than pnpm publish/pack. The 0.2.1 npm artifact therefore bypassed pnpm's workspace protocol rewrite and published the literal workspace:* dependency.
fix: Changed @napplet/nub to depend on @napplet/core via "workspace:^"; changed root publish-packages to run "turbo run build && pnpm publish -r --access public --no-git-checks"; added a publish-manifest regression; added @napplet/nub test:unit wiring and package-level Vitest config; added a changeset note for the next @napplet/nub release.
verification: npm registry repro confirmed the current broken 0.2.1 artifact; focused regression failed before the fix and passed after; pnpm pack emits "@napplet/core": "^0.2.1"; pnpm type-check, pnpm build, pnpm test, and pnpm lint exit 0.
files_changed:
- package.json
- packages/nub/package.json
- packages/nub/src/publish-manifest.test.ts
- packages/nub/vitest.config.ts
- pnpm-lock.yaml
- .changeset/fix-nub-publish-dependency.md
- .planning/debug/resolved/napplet-nub-workspace-dep.md
