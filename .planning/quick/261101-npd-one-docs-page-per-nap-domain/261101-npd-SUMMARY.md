# Quick task 261101-npd: one docs page per NAP domain

Split the single long NAP domain reference into one page per shipped domain, added pages for the previously undocumented `shell`, `count`, `dm`, `serial`, and `webrtc` domains from their shipped SDK surface, and replaced the index body with grouped purpose tables. `NAP_DOC_GROUPS` in `scripts/lib/nap-maturity-docs.ts` drives both the docs sidebar and the index tables; a unit test requires it to cover every catalog domain exactly once and every page to carry its catalog maturity notice.

The GAMEPAD guide now links NAP-GAMEPAD PR #130 (open, the reopened proposal the catalog tracks) instead of the merged-then-reopened #108.

Proof screenshots are in `proof/`.
