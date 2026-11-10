---
quick_id: 261110-vep
status: complete
date: 2026-11-10
commit: 3d605a11
---

# Summary: id-less intent delivery

- Code commit 3d605a11, docs commit b8da6dc8.
- Reference shell: `PendingVisit` records `revision` and the queued envelope; `failNavigationDelivery(endpointId, definite?)` removes that envelope by identity. `retryIntent` was retired with the delivery IDs (rule 8).
- Verification: build, type-check, all unit suites green. The shim `prelude-import` test timed out once at a load average of about 134 and passed on rerun. Issue repro type-checks, null sender and `id` are rejected. Contracts script passes. aislop 99/100 (deepmerge baseline).
- Not changed: `apps/web/src/data/protocol.json` is a generated NAPs snapshot with its own refresh.
