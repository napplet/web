---
quick_id: 261031-bnu
status: complete
---

# NAP-SOULSEEK across the napplet stack

Implemented the draft NAP-SOULSEEK contract (napplet/naps#135, `naps/NAP-SOULSEEK.md` at head `892ed8d4909c28ab5c1a469ef8984721b75d6c8f`) as the `soulseek` domain across core types, `@napplet/nap/soulseek`, `@napplet/sdk` (root namespace and `/soulseek` subpath), the shim runtime binding, vite-plugin requirement inference, conformance (envelope specs, request validator, reference shell backend, embedded browser prelude, real opaque-iframe round trip), docs, READMEs, skills, and a changeset. Branch `feat/nap-soulseek`, PR: https://github.com/napplet/web/pull/281.

## Completion evidence

| Requirement | Evidence |
| --- | --- |
| Chase the living spec, not memory | Fetched the PR head `NAP-SOULSEEK.md` and the registry row before coding. Fourteen operations, ten records, the `value` xor `error` result rule, decimal-text byte counts, the transfer state table, the error-code table, and the ownership rules are implemented as written; no listener, push, login, chat, or share surface was added. |
| Core + nap domain | `e8f5b4d2`: `NapDomain`/`NAP_DOMAINS`, `SoulseekApi` and records, wire envelope types, shim with id+type correlation and `SoulseekError`, prefixed SDK helpers, `isSoulseekFailure`; 52 tests. |
| SDK, shim, vite-plugin | `aba8b966`: `@napplet/sdk/soulseek`, root exports, runtime binding and router, requirement inference; node, happy-dom, and vitest coverage. |
| Conformance | `c88cbe8e`: 28 discriminants (271 total), `validateSoulseekRequest`, `reference-soulseek.ts`, embedded prelude, browser round trip; 230 conformance tests and 34 conformance-cli tests. |
| Docs, skills, changeset | `e92a179d`: `apps/docs/naps/soulseek.md`, nav entry, domain enumerations in every README and docs page, skill guidance, minor/patch changeset. |
| Repository verification | `pnpm build` 12/12; `pnpm type-check` 19/19; `pnpm -r test:unit` green in every workspace; skills contracts 11/11; `check:jsr` clean. The AI-slop gate runs in CI (`aislop` is not installed locally). |

## Binding decisions recorded for reviewers

- Results resolve with the API row's record; a `Failure` rejects as `SoulseekError` with the specification `code`; a malformed result (both or neither of `value`/`error`, unknown code) rejects with a plain `Error` rather than an invented code; the binding's transport timeout also rejects without a `code`.
- `search`, `browse`, `download`, `read`, and `save` get a longer local deadline because the spec lets the shell gate them behind user prompts.
- The reference shell is a deterministic mock (online account, one canned peer, three fixture files, transfers complete on the next `status`/`transfers` poll, reads granted, `save` unsupported). It proves protocol shape only.

## Environment notes

`pnpm install` was needed after fast-forwarding `main` (the Astro site and VitePress deps were missing). The machine had 134 MiB free; the gitignored `.turbo/cache` (1.3 GB) was removed to let the install finish. No tracked files outside this task were touched; the pre-existing `deno.lock` / `package.json` workspace edits remain uncommitted in the tree.
