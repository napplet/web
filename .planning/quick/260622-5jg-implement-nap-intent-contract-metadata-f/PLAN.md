# Plan

## Scope

Align the existing NAP-INTENT implementation with `napplet/naps` PR #55 by adding
manifest-derived intent contracts to the typed availability surface and updating
the Vite manifest archetype tag builder so it emits one tag per protocol.

## Constraints

- Treat PR #55 as canonical.
- Do not add new intent wire verbs or runtime discovery behavior.
- Keep `actions` and `protocols` as summary arrays derived from per-contract data.
- Do not emit archetype tags that name several NAP-N protocols in one tag.

## Steps

1. Add `IntentContract` to core and nap intent types, and require
   `IntentCandidate.contracts`.
2. Update shim/reference-shell tests and docs examples to include contracts.
3. Update the Vite plugin archetype option docs/types/builder/tests to emit one
   manifest tag per protocol and support per-protocol event-kind constraints.
4. Add a changeset, run focused package checks plus the standard repo gates, then
   commit, push, open a PR, and wait for GitHub checks.
