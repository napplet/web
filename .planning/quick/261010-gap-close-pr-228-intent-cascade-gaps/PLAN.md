# Close completeness gaps in PR #228 (NAP-INTENT cascade)

Non-normative follow-up to `fix/nap-intent-amendments` (napplet/web#228). Protocol authority remains the living [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303), [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md), [web projection](https://github.com/napplet/naps/blob/master/projections/web.md), and [NAP-SHELL](https://github.com/napplet/naps/blob/master/naps/NAP-SHELL.md). Audit compared the PR head (fc2d7a70) against NAPs master e5308ac and NIP-5D head 020cb8b.

## Gaps found

1. `apps/docs/guide/concepts.md` still shows the retired three-argument `intent.open(archetype, payload, { convention })` call and logs `result.ok` twice.
2. `apps/docs/guide/getting-started.md` still describes the retired `handled` semantics ("whether a handler accepted the request") and links pinned draft commit heads as the contract, contrary to the no-pinned-snapshot rule.
3. `skills/napplet-sdk/SKILL.md` omits `shell` from the shipped-domain list and states `window.napplet.shell` / `shell.ready()` / `shell.supports()` do not exist, contradicting the new "Optional shell environment" section in the same skill. `napplet-design`, `napplet-test`, and `napplet-port` repeat the "does not exist" claim.
4. `packages/boilerplate/README.md` shows the legacy `["archetype", …]` manifest tag as current output; NIP-5D defines `z` / `i`.
5. `apps/docs/naps/index.md` core domain union omits `shell` (and the already-shipped `count`, `dm`).
6. Conformance `intent.invoke` validation ignores `handler`, `handlerHint`, and `behavior`, so a wire request with a non-`35129` hint coordinate, a non-string `handler`, or non-string relay hints passes (NAP-INTENT `IntentInvokeOptions` / `IntentHandlerHint` schemas; web projection fragment binding).

## Tasks

1. Fix the docs and skill passages above; keep every statement non-normative and deferring to the living documents.
2. Validate optional `handler` (text), `behavior` (object), and `handlerHint` (`address` = `35129:<64 lowercase hex>:<non-empty d>`, optional `relays` list of text) in `validateIntentInvokeRequest`, with test vectors.
3. Extend `scripts/skills-contracts.test.mjs` so the SDK skill cannot regress to denying the optional `shell` domain.
4. Run `pnpm build`, `pnpm type-check`, `pnpm -r test:unit`, the skills contract test, and the slop gate; open a PR with base `fix/nap-intent-amendments` and comment the gap list on #228.

## Out of scope (flagged only)

- `packages/shim/src/runtime-guard.ts` exports `markRuntimePresent` / `installRuntimeGuard` that nothing calls on `main` or on the PR branch; its comments still describe a "handshake". Pre-existing, unrelated to the amendments.
- NAPs #99 editorial conflict (duplicated `IntentInvokeOptions` table, fragment rejection vs. web-projection fragment binding) is already surfaced in #228.
