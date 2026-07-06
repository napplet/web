---
status: complete
completed: 2026-07-06
commit: f8ea69a7
---

# Summary

Updated napplet authoring skills so implementation examples and completion checks are SDK-first:

- `build-napplet` now says direct `window.napplet?.domain` access is for availability checks, fallback branching, or true SDK gaps.
- Resource/config/theme examples now import helpers from `@napplet/sdk`, using `themeGet` / `themeOnChanged` for the current theme helper shape.
- `make-napplet`, `design-napplet`, and `port-nostr-app` now ask for SDK helpers/imports in the build brief and migration handoff.
- Package docs mirror the SDK-first rule.
- Skill registry tests now guard against the old direct-call-equivalence phrasing.

## Verification

- `pnpm --filter @napplet/skills test:unit`
- `pnpm --filter @napplet/skills type-check`
- `pnpm --filter @napplet/skills build`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm lint` (no configured lint tasks)
- `pnpm dlx aislop scan --json .` (score 90 / Healthy; zero errors)
- `git diff --check`

## Notes

The user assertion was valid with one boundary: direct `window.napplet?.domain`
checks remain the correct capability probe, but app method calls should use SDK
helpers when they exist.
