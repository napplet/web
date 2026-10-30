---
status: complete
quick_id: 261030-pp3
commit: 899f91fc
pr: https://github.com/napplet/web/pull/277
---

# NAP-MESH package support

Implemented and shipped for review from the isolated `feat/nap-mesh` worktree. The original showcase checkout and its unrelated changes were preserved. PR [#277](https://github.com/napplet/web/pull/277) is open.

## Delivered scope

- Core exposes the mesh domain, global API, shared types, and optional template tags/timestamp used by canonical publish examples. Signed event fields remain required.
- NAP supplies all twelve wire types, four operations, result correlation, subscription refusal and closure, local-backlog EOSE, cleanup, resource sidecar hydration, and layered npm/JSR exports.
- SDK supplies root and mesh-subpath wrappers, aliases, types, and package build/export maps.
- Shim connects mesh to explicit runtime selection and trusted-parent routing. Existing compatibility installation defaults remain documented.
- Conformance recognizes the wire, validates TTL/hash/filter inputs, handles correlated reference refusals, and tests the built runtime IIFE. The offline fixture explicitly refuses publishing without a signer/store.
- Vite infers mesh declarations; CLI tests preserve required/optional mesh metadata without adding relay grants. No CLI implementation change was needed.
- Package READMEs, docs navigation and MESH guide, SDK/design skills, and six package changesets accompany the implementation.

## Verification

Final code was verified after the last code edit and committed as `899f91fc`:

| Gate | Result |
|------|--------|
| `pnpm build` | 12 tasks passed, including standalone CLI targets and docs |
| `pnpm type-check` | 19 tasks passed |
| `pnpm -r test:unit` | 839 passed; three existing opt-in CLI tests ignored |
| `pnpm check:jsr` | All export files exist and are publish-included |
| `pnpm test:skills-contracts` | 11 passed |
| Assembled-site `pnpm check:links` | 26 URLs, no broken internal links |
| `aislop@0.12.0 scan --json .` | 98/100, zero errors; unchanged low-severity deepmerge advisory |
| `git diff --check` | Passed |
| Independent protocol/security review | No blocking findings |

Behavioral coverage includes omitted/zero TTL, effective clamp reports, live events after EOSE, error-only response types, close/refusal/timeout/send-failure cleanup, ID and result-type isolation, unavailable-domain guards, trusted-parent routing, manifest declarations, and built runtime integration. Shared clone and resource helpers were reused; no dependencies or transport layers were added.

## Protocol and limitations

The live NAP-MESH draft [PR #122](https://github.com/napplet/naps/pull/122) head was `bf9a4722244e29661c06d2fb4db7d3c7346d064a`; NIP-5D [PR #2303](https://github.com/nostr-protocol/nips/pull/2303) head was `6e24617cde507c0a87fa170af9ed6b2b46545b2d`. Both were rechecked before shipping. NAP-RELAY PR #2 schema was read to verify shared template compatibility. Documentation remains non-normative and links to living proposals.

Circle pairing, signing, storage, forwarding, policy, and blob probing remain host responsibilities. No production circle transport was exercised. Hosted checks were queued/running when the PR opened; local gates above passed. No merge or publication was requested.
