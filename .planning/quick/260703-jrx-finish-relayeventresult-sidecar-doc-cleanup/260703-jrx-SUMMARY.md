---
status: complete
quick_id: 260703-jrx
completed: 2026-07-03
commit: e1aceaed
---

# Quick Task 260703-jrx Summary

## Result

The live resource policy checklist now points sidecar pre-resolution at `RelayEventResult.sidecar.resources`. The invalid conformance samples still prove that napplets must not emit inbound `relay.event` messages, but now use the current `{ result: { event } }` shape.

## Changed Files

- `specs/SHELL-RESOURCE-POLICY.md`
- `packages/conformance/src/validators/envelope.test.ts`
- `tests/fixtures/napplets/broken/main.js`

## Verification

- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm dlx aislop@0.12.0 scan --json .`
- `git diff --check`

## Notes

- No changeset: docs and invalid-fixture/test cleanup only; package output did not change.
- `aislop` remained Healthy with pre-existing file-size warnings and the existing `js-yaml` advisory; this task touched none of those files.
