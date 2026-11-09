---
phase: quick-261031-bnu
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/core/src/types/soulseek.ts
  - packages/core/src/envelope.ts
  - packages/core/src/types/global.ts
  - packages/nap/src/soulseek/*
  - packages/sdk/src/soulseek.ts
  - packages/shim/src/runtime.ts
  - packages/shim/src/runtime-globals-services.ts
  - packages/conformance/src/validators/soulseek.ts
  - packages/conformance/src/shell/reference-soulseek.ts
  - packages/conformance/src/run/soulseek-prelude.ts
  - packages/vite-plugin/src/requirements.ts
  - apps/docs/naps/soulseek.md
autonomous: true
requirements: [NAP-SOULSEEK]
must_haves:
  truths:
    - "window.napplet.soulseek exposes exactly the 14 NAP-SOULSEEK operations and no listeners or pushes"
    - "Every result envelope is matched by id and type and carries exactly one of value or error"
    - "Conformance validates the 14 request schemas (canonical decimal text, positive integers, handle kinds) and rejects napplet-emitted results"
    - "The reference shell models endpoint-owned queries and transfers deterministically without a Soulseek backend"
  artifacts:
    - "@napplet/nap/soulseek barrel, types, shim, sdk subpaths"
    - "@napplet/sdk/soulseek subpath and root soulseek namespace"
    - "apps/docs/naps/soulseek.md non-normative guide"
  key_links:
    - "https://github.com/napplet/naps/pull/135 (head 892ed8d4909c28ab5c1a469ef8984721b75d6c8f)"
---

# Quick task 261031-bnu: implement NAP-SOULSEEK across the napplet stack

## Source of truth

`naps/NAP-SOULSEEK.md` at napplet/naps PR #135, head `892ed8d4909c28ab5c1a469ef8984721b75d6c8f`. Domain `soulseek`, 14 request/result operations, no unsolicited messages, `value` xor `error` (`Failure {code, message}`) results, 64-bit byte counts as canonical decimal text, endpoint-owned opaque handles.

## Binding decisions (plumbing, not protocol)

- The web binding returns the API row's result type from each Promise. A result carrying `error` rejects with a `SoulseekError` (an `Error` with the spec `code`). A local transport timeout rejects with a plain `Error`, so callers can tell a lost response from an explicit failure (spec: "A lost response is different from an explicit error").
- Optional `results` parameters (`after`, `limit`) are omitted from the envelope when `undefined`; `null` is never sent.
- The reference shell is a deterministic mock: online account, one canned peer, instant transfers, `canSave: false`. It exercises handles, pagination, ownership, state transitions, and error codes; it does not claim live Soulseek support.

## Tasks

1. Core + nap domain: `NapDomain` + `NAP_DOMAINS` gain `soulseek`; `packages/core/src/types/soulseek.ts` records + `SoulseekApi`; `packages/nap/src/soulseek/{types,shim,sdk,index}.ts` with tests; nap package/jsr/tsup exports.
2. SDK + shim + vite-plugin: `@napplet/sdk/soulseek` subpath, root `soulseek` namespace, prefixed helpers, type re-exports; runtime binding install and `soulseek.` router; requirement inference; tests.
3. Conformance: envelope specs (28 discriminants), `validateSoulseekRequest`, reference handler + `reference-soulseek.ts`, embedded prelude binding, browser round trip; tests.
4. Docs + release: README, package READMEs, apps/docs (naps/soulseek.md, index, config, package pages), skills, changeset.

## Verification

`pnpm build`, `pnpm type-check`, `pnpm -r test:unit`, `pnpm test:skills-contracts`, `pnpm check:jsr`.
