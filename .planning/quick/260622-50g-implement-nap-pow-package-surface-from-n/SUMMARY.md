# Summary

## Result

Implemented NAP-POW from `napplet/naps` PR #39 as a typed, shell-mediated proof-of-work job surface.

The branch adds the `pow` domain to core types and constants, exposes `@napplet/nap/pow`,
mounts `window.napplet.pow` through `@napplet/shim`, re-exports POW helpers from
`@napplet/sdk`, extends conformance envelope coverage and the reference shell, and
updates docs, package export maps, JSR metadata, and package build entries.

## Constraints Preserved

- The SDK and shim do not mine locally. The shell owns CPU scheduling, workers,
  identity stamping, signing, publish fanout, consent, and policy.
- `mine` models an unsigned mined event by allowing `sig` to be absent.
- `mineAndPublish` remains shell-mediated and has no relay argument.
- `formatHashRate` is a local helper and does not send a wire message.
- Implementation follows PR #39 only; no additional POW wire surface was invented.

## Verification

- `pnpm install --lockfile-only`
- `pnpm install --frozen-lockfile`
- `pnpm --filter @napplet/core build`
- `pnpm --filter @napplet/core type-check`
- `pnpm --filter @napplet/nap build`
- `pnpm --filter @napplet/nap type-check`
- `pnpm --filter @napplet/nap test:unit -- --run src/pow/shim.test.ts`
- `pnpm --filter @napplet/shim type-check`
- `pnpm --filter @napplet/sdk type-check`
- `pnpm --filter @napplet/conformance test:unit -- --run src/validators/envelope.test.ts src/validators/envelope.drift.test.ts src/shell/reference-shell.test.ts`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- Export map count check: `packages/nap/package.json` exports count is `68`
- Stale docs scan for old active-domain/export-count wording
- Local docs link check: `18` internal URLs checked, no broken internal links
- `npx --yes aislop scan -d` passed at `98/100`
- `git diff --check`

## Risks

- No real shell miner, worker scheduler, consent prompt, signing path, publish fanout,
  or NIP-13 hash validation was exercised in this branch.
- The slop gate still reports the inherited `js-yaml` advisory; the high Vite advisory
  was cleared by patch-bumping Vite from `6.4.2` to `6.4.3`.
