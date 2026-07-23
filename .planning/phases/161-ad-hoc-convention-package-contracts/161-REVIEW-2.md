---
phase: 161-ad-hoc-convention-package-contracts
reviewed: 2026-07-23T17:32:27Z
depth: deep
files_reviewed: 100
files_reviewed_list:
  - .changeset/ad-hoc-convention-contracts.md
  - .changeset/ad-hoc-convention-guidance.md
  - README.md
  - apps/docs/guide/build-note-drafts-napplet-from-boilerplate.md
  - apps/docs/guide/build-note-drafts-napplet-with-ai-agent-and-skills.md
  - apps/docs/guide/build-note-drafts-napplet.md
  - apps/docs/guide/concepts.md
  - apps/docs/guide/getting-started.md
  - apps/docs/guide/index.md
  - apps/docs/guide/nip-5d.md
  - apps/docs/naps/index.md
  - apps/docs/packages/boilerplate.md
  - apps/docs/packages/cli.md
  - apps/docs/packages/core.md
  - apps/docs/packages/nap.md
  - apps/docs/packages/sdk.md
  - apps/docs/packages/shim.md
  - apps/docs/packages/vite-plugin.md
  - apps/web/src/lib/site.ts
  - package.json
  - packages/boilerplate/README.md
  - packages/cli/README.md
  - packages/cli/src/cli.ts
  - packages/cli/src/config.ts
  - packages/cli/src/init-wizard.ts
  - packages/cli/src/manifest-metadata.ts
  - packages/cli/src/mod.ts
  - packages/cli/src/output.ts
  - packages/cli/src/types.ts
  - packages/cli/tests/config_test.ts
  - packages/cli/tests/init_wizard_test.ts
  - packages/cli/tests/manifest_test.ts
  - packages/conformance-cli/README.md
  - packages/conformance-cli/src/cli.test.ts
  - packages/conformance-cli/src/ui-server.test.ts
  - packages/conformance/README.md
  - packages/conformance/src/checks/catalog.test.ts
  - packages/conformance/src/shell/reference-shell.test.ts
  - packages/conformance/src/shell/reference-shell.ts
  - packages/conformance/src/validators/envelope.test.ts
  - packages/conformance/src/validators/envelope.ts
  - packages/conformance/src/validators/manifest.test.ts
  - packages/conformance/src/validators/manifest.ts
  - packages/core/README.md
  - packages/core/src/index.ts
  - packages/core/src/intent-contract.test.ts
  - packages/core/src/topics.ts
  - packages/core/src/types/global.ts
  - packages/core/src/types/global/nostr-api.ts
  - packages/core/src/types/global/runtime-api.ts
  - packages/core/src/types/global/service-api.ts
  - packages/core/src/types/intent.ts
  - packages/nap/README.md
  - packages/nap/src/boundary-smoke.test.ts
  - packages/nap/src/config/sdk.ts
  - packages/nap/src/config/shim.test.ts
  - packages/nap/src/config/shim.ts
  - packages/nap/src/config/types.ts
  - packages/nap/src/convention-uri.test.ts
  - packages/nap/src/convention-uri.ts
  - packages/nap/src/inc-compat.test.ts
  - packages/nap/src/inc/sdk.ts
  - packages/nap/src/inc/shim.ts
  - packages/nap/src/inc/types.ts
  - packages/nap/src/intent/index.ts
  - packages/nap/src/intent/sdk.ts
  - packages/nap/src/intent/shim.test.ts
  - packages/nap/src/intent/shim.ts
  - packages/nap/src/intent/types.ts
  - packages/sdk/README.md
  - packages/sdk/src/config.ts
  - packages/sdk/src/cvm.ts
  - packages/sdk/src/nap-runtime.ts
  - packages/sdk/src/nap-types.ts
  - packages/sdk/src/relay.ts
  - packages/shim/README.md
  - packages/shim/src/runtime-guard.test.ts
  - packages/shim/src/runtime-guard.ts
  - packages/shim/src/runtime.ts
  - packages/shim/src/shell.test.ts
  - packages/skills/README.md
  - packages/skills/skills/build-napplet/SKILL.md
  - packages/skills/skills/design-napplet/SKILL.md
  - packages/skills/skills/make-napplet/SKILL.md
  - packages/skills/skills/test-napplet/SKILL.md
  - packages/skills/src/index.test.ts
  - packages/vite-plugin/README.md
  - packages/vite-plugin/package.json
  - packages/vite-plugin/src/index.test.ts
  - packages/vite-plugin/src/index.ts
  - packages/vite-plugin/src/manifest.ts
  - packages/vite-plugin/src/types.ts
  - pnpm-workspace.yaml
  - scripts/test-convention-contracts.mjs
  - scripts/test-convention-contracts.test.mjs
  - scripts/test-tutorial.mjs
  - tests/fixtures/napplets/broken/index.html
  - tests/fixtures/napplets/conformant/index.html
  - tests/fixtures/napplets/conformant/main.js
  - tests/fixtures/napplets/resource-data/index.html
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 161: Code Review Report — Re-review

**Reviewed:** 2026-07-23T17:32:27Z
**Depth:** deep
**Files Reviewed:** 100
**Status:** clean

## Summary

Deep re-review of the phase changes through `94a34378`, including the final remediation in `fc85f3ce`. The previous blockers are resolved: active HTML `napplet-*` metadata is no longer used as protocol input or an opt-out; config schema discovery is explicit while the signed manifest tag remains; and malformed, conflicting, query/fragment-bearing, or forged-sender `intent.invoke` requests fail conformance. INC examples and the regression scanner use the same exact topic form.

Cross-module tracing found the manifest writer still carries configuration schema only in the signed NIP-5A manifest, and the config shim updates its schema only after a successful `config.registerSchema.result`. The reference shell, envelope validator, and catalog checks agree on rejecting invalid normalized intent envelopes. Scans found no active residual of the forbidden PR 89–91 surface; the lone production `napplet-*` HTML mention is a negative policy statement in the conformance validator, not a dependency.

Verification completed: `pnpm type-check`; focused Vitest suites for conformance, NAP, vite-plugin, and skills; `pnpm test:convention-contracts`; and `git diff --check origin/main...HEAD`.

## Narrative Findings (AI reviewer)

No Critical, Warning, or Info findings remain in the reviewed scope.

---

_Reviewed: 2026-07-23T17:32:27Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
