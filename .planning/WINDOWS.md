---
schema_version: 1
open_count: 5
waived_count: 0
fixed_count: 0
total_count: 5
last_updated: 2026-07-23T15:08:40.729Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 161 | stub | packages/nap/src/intent/index.ts | 75 | Pre-existing no-op dispatch registration placeholder; it was not altered by this plan and does not affect the shim's request/result forwarding path. | open |  | 2026-07-23T13:38:39.872Z |  |
| 2 | 161 | deviation | packages/sdk/src/nap-types.ts | 351 | Full build/type-check blocked by stale IntentContract import outside 161-02 scope. | open |  | 2026-07-23T13:48:43.296Z |  |
| 3 | 161 | deviation | packages/conformance/src/validators/envelope.test.ts | 86 | Corrected a malformed-request test assertion to match the established validator error shape. | open |  | 2026-07-23T14:10:44.449Z |  |
| 4 | 161 | deviation | packages/skills/README.md |  | Phase-wide convention guard remains red on active CLI/docs/SDK surfaces outside Plan 161-09 ownership. | open |  | 2026-07-23T14:17:38.934Z |  |
| 5 | 161 | deviation | .planning/phases/161-ad-hoc-convention-package-contracts/161-11-PLAN.md |  | Plan-wide convention guard was deferred from tracer verification until Task 2 migrated its scanned tutorial files. | open |  | 2026-07-23T15:08:40.729Z |  |

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
  }
]
````
