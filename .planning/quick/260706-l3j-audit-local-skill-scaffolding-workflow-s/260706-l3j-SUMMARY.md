---
status: complete
completed: 2026-07-06
quick_id: 260706-l3j
commit: 829b3121
---

# Quick Task 260706-l3j Summary

## Result

Updated the local napplet skill scaffolding workflow so new napplet projects start
from `@napplet/boilerplate` / `github.com/napplet/boilerplate` instead of
recreating package manager setup, Vite config, build scripts, conformance wiring,
file layout, and starter docs manually.

## Changed

- `packages/skills/skills/build-napplet/SKILL.md`: replaced the inline
  `pnpm add` / hand-written Vite setup path with a boilerplate-first workflow,
  explicit project-specific edit points, script preservation, and boilerplate
  validation commands.
- `packages/skills/skills/make-napplet/SKILL.md`: added the boilerplate substrate
  to the build brief and made template validation part of the done gate.
- `packages/skills/README.md` and `apps/docs/packages/skills.md`: documented
  `@napplet/boilerplate` as the authoritative scaffolding substrate for the
  shipped skills.
- `apps/docs/guide/getting-started.md`: reframed manual package/Vite wiring as
  an existing-app retrofit path and added boilerplate-equivalent scripts.
- `.changeset/brave-boilerplates-serve.md`: added a patch changeset for
  `@napplet/skills`.

## Validation

- `pnpm --filter @napplet/skills type-check` - pass.
- `pnpm --filter @napplet/skills test:unit` - pass, 12 tests.
- `pnpm --filter @napplet/boilerplate type-check` - pass.
- `pnpm --filter @napplet/boilerplate test:unit` - pass.
- `pnpm --filter @napplet/skills build` - pass.
- `pnpm --filter @napplet/boilerplate build` - pass.
- `pnpm --filter @napplet/web build` - pass.
- `pnpm --filter @napplet/docs build` - pass.
- `node scripts/check-links.mjs http://localhost:8099` against assembled static
  site - pass, 18 internal URLs checked.
- `pnpm lint` - pass, but turbo reported no lint tasks configured.
- `pnpm type-check` - pass.
- `pnpm -r test:unit` - pass.
- `pnpm build` - pass.
- `git diff --check` - pass.
- AI-slop gate - no `.aislop/config.yml` or `aislop` command configured in this
  checkout.

## Remaining Risks

- The external `github.com/napplet/boilerplate` template was cloned for audit and
  still contains stale protocol/package wording about napplet-owned
  `@napplet/shim` bootstrap and older service names. This branch makes local
  skills consume the template as the tooling substrate, but does not patch the
  external template repository.
