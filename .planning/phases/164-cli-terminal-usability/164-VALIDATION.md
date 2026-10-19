# Phase 164 validation

| Requirement | Evidence |
|---|---|
| Missing configuration recovery | Deno preflight tests and actual PTY completion of partial config |
| Colors and layout | color/no-color snapshots plus terminal screenshots |
| nsyte workflow considerations | source research and preflight/progress/result evidence |
| -i and CI safety | parser, prompt-policy, key-store and subprocess tests |
| ASCII napplet | real startup screenshot and machine-output assertions |
| Shipped with visual proof | open PR with embedded PNGs and reproducible capture instructions |

Run focused tests after each implementation slice, then root build, type-check, recursive unit tests, full tests, slop gate, and final GitHub checks. Capture from the shipped source revision. Do not mark phase complete until every row is proven.
