---
status: complete
completed: 2026-07-07
branch: fix/jsr-score-metadata
---

# Summary

Raised local JSR score readiness for the publishable `@napplet/*` packages.

## Findings

Live JSR score pages showed local score blockers in docs and slow-types for
`@napplet/cli`, `@napplet/conformance`, `@napplet/nap`, `@napplet/sdk`,
`@napplet/shim`, and `@napplet/vite-plugin`. `@napplet/core` and
`@napplet/skills` already had only account/project setting gaps.

Remaining non-local JSR score gaps are operator settings:

- Add package descriptions in JSR settings.
- Set runtime compatibility in JSR settings.
- Ensure each package is linked to the GitHub repository and published from
  GitHub Actions with OIDC provenance.

## Changes

- Added a patch changeset for packages with shipped source/readiness changes.
- Added missing module docs across `@napplet/cli`, `@napplet/nap`,
  `@napplet/shim`, and `@napplet/vite-plugin`.
- Added public JSDoc for CLI exports used by JSR docs scoring.
- Added explicit public API types that remove slow-types blockers in
  `@napplet/conformance`, `@napplet/nap`, and `@napplet/sdk`.
- Left protocol behavior unchanged; no message types, NAP domains, manifest
  tags, loading rules, or wire envelopes changed.

## Verification

- `pnpm --filter @napplet/sdk type-check`
- `pnpm --filter @napplet/nap type-check`
- `pnpm --filter @napplet/conformance type-check`
- `pnpm --filter @napplet/shim type-check`
- `pnpm --filter @napplet/vite-plugin type-check`
- `pnpm --filter @napplet/cli type-check`
- JSR dry-runs without `--allow-slow-types` for `@napplet/cli`,
  `@napplet/conformance`, `@napplet/core`, `@napplet/nap`, `@napplet/sdk`,
  `@napplet/shim`, `@napplet/skills`, and `@napplet/vite-plugin`.
- `pnpm check:jsr`
- `pnpm type-check`
- `pnpm build`
- `pnpm -r test:unit`
- `pnpm lint` (no configured package lint tasks)
- `git diff --check`
- `pnpm dlx aislop@0.12.0 scan --json .` -> 82/Healthy; zero format
  or lint findings; inherited large-file, duplicate-type, and `js-yaml`
  dependency warnings remain.
- `pnpm dlx aislop@0.12.0 scan --changes --json .` -> 90/Healthy; zero
  format, lint, or AI-slop findings; inherited large-file and `js-yaml`
  warnings remain.

`@napplet/vite-plugin` dry-run still reports a warning for its intentional
dynamic config import, but the dry-run succeeds and it is not a JSR score item.
