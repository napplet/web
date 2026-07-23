---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-07-23T13:38:39.872Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 161 | stub | packages/nap/src/intent/index.ts | 75 | Pre-existing no-op dispatch registration placeholder; it was not altered by this plan and does not affect the shim's request/result forwarding path. | open |  | 2026-07-23T13:38:39.872Z |  |

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
  }
]
````
