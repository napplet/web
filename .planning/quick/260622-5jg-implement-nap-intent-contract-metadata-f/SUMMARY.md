# Summary

## Result

Aligned the existing NAP-INTENT package surface and Vite manifest tag tooling with
`napplet/naps` PR #55.

The branch adds `IntentContract`, requires `IntentCandidate.contracts`, re-exports
the new type from core/nap/sdk type surfaces, updates intent shim tests and the
reference shell fixture, and changes the Vite plugin archetype builder to emit one
manifest tag per protocol. The plugin keeps the existing `naps` option as a
protocol-only convenience and adds `contracts` for per-protocol `kind:<number>`
constraints.

## Constraints Preserved

- No new `intent.*` wire verbs were added.
- `actions` and `protocols` remain summary arrays; `contracts` carries the
  manifest-derived action/protocol/event-kind detail required by PR #55.
- Protocol-less string shorthand remains accepted by the Vite plugin, but it no
  longer emits an invalid protocol-less archetype tag.
- Archetype tags with several NAP-N protocols in one tag are no longer emitted.

## Verification

- `pnpm --filter @napplet/core type-check`
- `pnpm --filter @napplet/core build`
- `pnpm --filter @napplet/nap build`
- `pnpm --filter @napplet/nap type-check`
- `pnpm --filter @napplet/nap test:unit -- --run src/intent/shim.test.ts`
- `pnpm --filter @napplet/vite-plugin type-check`
- `pnpm --filter @napplet/vite-plugin test:unit -- --run src/index.test.ts`
- `pnpm --filter @napplet/conformance test:unit -- --run src/shell/reference-shell.test.ts src/validators/envelope.test.ts`
- `pnpm --filter @napplet/sdk type-check`
- `pnpm --filter @napplet/shim type-check`
- `pnpm install --lockfile-only`
- `pnpm install --frozen-lockfile`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- Local docs link check: `18` internal URLs checked, no broken internal links
- `npx --yes aislop scan -d` passed at `98/100`
- `git diff --check`

## Risks

- No real installed-napplet manifest catalog parser was exercised; this branch
  updates the typed result shape and manifest tag emission contract.
- The slop gate still reports the inherited `js-yaml` warning. The high Vite
  advisory was cleared by patch-bumping Vite from `6.4.2` to `6.4.3`.
