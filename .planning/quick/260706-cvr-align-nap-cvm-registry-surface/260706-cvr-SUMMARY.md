---
status: complete
completed: 2026-07-06
commit: 0a0a7327
---

# Summary

Aligned the `cvm` package surface with the live NAP-CVM draft from
`napplet/naps` PR #31 by adding the registry request/result family:

- Added `cvm.registry.list`, `cvm.registry.has`, `cvm.registry.describe`, and
  `cvm.registry.call` wire types and result envelopes.
- Added core value types, injected-domain typings, `@napplet/nap/cvm` shim
  correlation, SDK helpers, and runtime-injected `window.napplet.cvm.registry`.
- Extended conformance envelope specs and regression tests for the registry
  family.
- Updated package and docs copy to mention CVM registry helpers.
- Added a changeset for the affected published packages.

## Audit Result

The wire-message audit compared implemented `@napplet/nap` domains against the
current `napplet/naps` sources, using merged `master` specs where available and
the live PR branch for proposed NAPs. CVM was the only confirmed message-set gap:
the implementation had `discover`, `request`, `close`, and `event`, while
NAP-CVM also defines the `registry.*` family.

Manual checks dismissed parser false positives in NAP-INC, NAP-KEYS, and
NAP-OUTBOX. In particular, NAP-OUTBOX `RelayEventResult.sidecar` support was
already present on current `main`.

This summary covers the CVM-specific PR. The broader project goal of complete
semantic alignment with every prose requirement remains open until a full
semantic audit is separately proven.

## Verification

- `pnpm --filter @napplet/nap test:unit -- --runInBand`
- `pnpm --filter @napplet/conformance test:unit -- --runInBand`
- `pnpm --filter @napplet/shim test:unit -- --runInBand`
- `pnpm --filter @napplet/core type-check`
- `pnpm --filter @napplet/nap type-check`
- `pnpm --filter @napplet/sdk type-check`
- `pnpm --filter @napplet/shim type-check`
- `pnpm --filter @napplet/conformance type-check`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm check:jsr`
- `npx -y aislop@0.12.0 scan --changes` (87 / 100 Healthy, zero errors)
- `node scripts/check-links.mjs http://localhost:8099`
- `git diff --check`

## Residual Risk

No real shell implementation backed by a ContextVM registry provider was run.
The audit evidence is wire-message-set matching plus manual review of known
false positives, not a full formal proof of every prose-level NAP MUST.

The slop scan still reports existing large-file/function warnings and a
transitive `js-yaml` advisory; none were introduced as new dependencies or
changed as part of this CVM alignment.
