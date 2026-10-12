---
schema_version: 1
open_count: 12
waived_count: 0
fixed_count: 2
total_count: 14
last_updated: 2026-10-12T19:35:48.549Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 161 | stub | packages/nap/src/intent/index.ts | 75 | Pre-existing no-op dispatch registration placeholder; it was not altered by this plan and does not affect the shim's request/result forwarding path. | open |  | 2026-07-23T13:38:39.872Z |  |
| 2 | 161 | deviation | packages/sdk/src/nap-types.ts | 351 | Full build/type-check blocked by stale IntentContract import outside 161-02 scope. | open |  | 2026-07-23T13:48:43.296Z |  |
| 3 | 161 | deviation | packages/conformance/src/validators/envelope.test.ts | 86 | Corrected a malformed-request test assertion to match the established validator error shape. | open |  | 2026-07-23T14:10:44.449Z |  |
| 4 | 161 | deviation | packages/skills/README.md |  | Phase-wide convention guard remains red on active CLI/docs/SDK surfaces outside Plan 161-09 ownership. | open |  | 2026-07-23T14:17:38.934Z |  |
| 5 | 161 | deviation | .planning/phases/161-ad-hoc-convention-package-contracts/161-11-PLAN.md |  | Plan-wide convention guard was deferred from tracer verification until Task 2 migrated its scanned tutorial files. | open |  | 2026-07-23T15:08:40.729Z |  |
| 6 | 161 | deviation | .planning/STATE.md |  | Corrected stale twelve-plan counter that marked Phase 161 ready for verification before Plan 161-10 completed. | open |  | 2026-07-23T15:10:55.730Z |  |
| 7 | quick-260803-f6z | unrun-verify | .github/workflows/ai-slop.yml |  | Local AI-slop scan is unavailable; the repository defines it only as a GitHub Actions composite action. | fixed |  | 2026-08-03T10:31:16.170Z | 2026-08-03T10:32:22.997Z |
| 8 | 162 | unrun-verify | packages/build-tools/package.json |  | Plan command pnpm --filter @napplet/build-tools test:unit could not run because the package declares no test:unit script; equivalent scoped Deno tests passed. | fixed |  | 2026-08-21T16:29:43.919Z | 2026-08-21T16:32:07.449Z |
| 9 | 162 | deviation | packages/cli/src/output.ts |  | Incomplete direct-upload batches now fail CLI deployment reporting | open |  | 2026-08-21T16:51:53.639Z |  |
| 10 | quick-261012-jnp | lint-warning | packages/vite-plugin/src/optimizer/references.ts |  | AI-slop 96/100 includes existing 472-line references.ts warning; unchanged by integration repair. | open |  | 2026-10-12T19:24:33.872Z |  |
| 11 | quick-261012-jnp | lint-warning | packages/cli/src/output.ts | 69 | AI-slop reports existing 89-line renderDeployReport warning; integration does not alter that function. | open |  | 2026-10-12T19:24:34.151Z |  |
| 12 | quick-261012-jnp | deviation | packages/boilerplate/package.json |  | Existing main fflate 0.8.2 has moderate GHSA-px8p-9vwx-vf98; audit exits 1, unchanged AI-slop minimum70 gate passes96. | open |  | 2026-10-12T19:24:34.361Z |  |
| 13 | quick-261012-jnp | unmet-truth | packages/nap/src/resource/types.ts | 120 | Living NAP-RESOURCE urls/base64 wire contract differs from existing requests/Blob SDK; both lineages predate integration. Explicit breaking-migration scope decision needed. | open |  | 2026-10-12T19:31:31.145Z |  |
| 14 | quick-261012-jnp | lint-warning | packages/vite-plugin/src/manifest.ts |  | Final post-commit full AI-slop scan reports combined manifest.ts at 445 lines; unchanged minimum70 gate passes95, target100 not claimed. | open |  | 2026-10-12T19:35:48.549Z |  |

````json
[
  {
    "id": 1,
    "kind": "stub",
    "phase": "161",
    "file": "packages/nap/src/intent/index.ts",
    "line": 75,
    "description": "Pre-existing no-op dispatch registration placeholder; it was not altered by this plan and does not affect the shim's request/result forwarding path.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-07-23T13:38:39.872Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "161",
    "file": "packages/sdk/src/nap-types.ts",
    "line": 351,
    "description": "Full build/type-check blocked by stale IntentContract import outside 161-02 scope.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-07-23T13:48:43.296Z",
    "resolved_at": null
  },
  {
    "id": 3,
    "kind": "deviation",
    "phase": "161",
    "file": "packages/conformance/src/validators/envelope.test.ts",
    "line": 86,
    "description": "Corrected a malformed-request test assertion to match the established validator error shape.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-07-23T14:10:44.449Z",
    "resolved_at": null
  },
  {
    "id": 4,
    "kind": "deviation",
    "phase": "161",
    "file": "packages/skills/README.md",
    "line": null,
    "description": "Phase-wide convention guard remains red on active CLI/docs/SDK surfaces outside Plan 161-09 ownership.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-07-23T14:17:38.934Z",
    "resolved_at": null
  },
  {
    "id": 5,
    "kind": "deviation",
    "phase": "161",
    "file": ".planning/phases/161-ad-hoc-convention-package-contracts/161-11-PLAN.md",
    "line": null,
    "description": "Plan-wide convention guard was deferred from tracer verification until Task 2 migrated its scanned tutorial files.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-07-23T15:08:40.729Z",
    "resolved_at": null
  },
  {
    "id": 6,
    "kind": "deviation",
    "phase": "161",
    "file": ".planning/STATE.md",
    "line": null,
    "description": "Corrected stale twelve-plan counter that marked Phase 161 ready for verification before Plan 161-10 completed.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-07-23T15:10:55.730Z",
    "resolved_at": null
  },
  {
    "id": 7,
    "kind": "unrun-verify",
    "phase": "quick-260803-f6z",
    "file": ".github/workflows/ai-slop.yml",
    "line": null,
    "description": "Local AI-slop scan is unavailable; the repository defines it only as a GitHub Actions composite action.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-03T10:31:16.170Z",
    "resolved_at": "2026-08-03T10:32:22.997Z"
  },
  {
    "id": 8,
    "kind": "unrun-verify",
    "phase": "162",
    "file": "packages/build-tools/package.json",
    "line": null,
    "description": "Plan command pnpm --filter @napplet/build-tools test:unit could not run because the package declares no test:unit script; equivalent scoped Deno tests passed.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-21T16:29:43.919Z",
    "resolved_at": "2026-08-21T16:32:07.449Z"
  },
  {
    "id": 9,
    "kind": "deviation",
    "phase": "162",
    "file": "packages/cli/src/output.ts",
    "line": null,
    "description": "Incomplete direct-upload batches now fail CLI deployment reporting",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T16:51:53.639Z",
    "resolved_at": null
  },
  {
    "id": 10,
    "kind": "lint-warning",
    "phase": "quick-261012-jnp",
    "file": "packages/vite-plugin/src/optimizer/references.ts",
    "line": null,
    "description": "AI-slop 96/100 includes existing 472-line references.ts warning; unchanged by integration repair.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-12T19:24:33.872Z",
    "resolved_at": null,
    "milestone": "v0.34.0"
  },
  {
    "id": 11,
    "kind": "lint-warning",
    "phase": "quick-261012-jnp",
    "file": "packages/cli/src/output.ts",
    "line": 69,
    "description": "AI-slop reports existing 89-line renderDeployReport warning; integration does not alter that function.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-12T19:24:34.151Z",
    "resolved_at": null,
    "milestone": "v0.34.0"
  },
  {
    "id": 12,
    "kind": "deviation",
    "phase": "quick-261012-jnp",
    "file": "packages/boilerplate/package.json",
    "line": null,
    "description": "Existing main fflate 0.8.2 has moderate GHSA-px8p-9vwx-vf98; audit exits 1, unchanged AI-slop minimum70 gate passes96.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-12T19:24:34.361Z",
    "resolved_at": null,
    "milestone": "v0.34.0"
  },
  {
    "id": 13,
    "kind": "unmet-truth",
    "phase": "quick-261012-jnp",
    "file": "packages/nap/src/resource/types.ts",
    "line": 120,
    "description": "Living NAP-RESOURCE urls/base64 wire contract differs from existing requests/Blob SDK; both lineages predate integration. Explicit breaking-migration scope decision needed.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-12T19:31:31.145Z",
    "resolved_at": null,
    "milestone": "v0.34.0"
  },
  {
    "id": 14,
    "kind": "lint-warning",
    "phase": "quick-261012-jnp",
    "file": "packages/vite-plugin/src/manifest.ts",
    "line": null,
    "description": "Final post-commit full AI-slop scan reports combined manifest.ts at 445 lines; unchanged minimum70 gate passes95, target100 not claimed.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-12T19:35:48.549Z",
    "resolved_at": null,
    "milestone": "v0.34.0"
  }
]
````
