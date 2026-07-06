---
status: complete
quick_id: 260703-jrx
created: 2026-07-03
completed: 2026-07-03
---

# Quick Task 260703-jrx: Finish RelayEventResult sidecar doc cleanup

## Goal

Remove stale live napplet references to the pre-result relay event sidecar shape after the main package migration to `RelayEventResult`.

## Tasks

1. Audit current `napplet/web` source, docs, tests, and fixtures for old `relay.event` event/resource carrier examples.
2. Update only live policy/test-fixture references that still show the old shape.
3. Verify the cleanup with focused and repo-wide gates.

## Outcome

Complete in implementation commit `e1aceaed`.
