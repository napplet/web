---
status: complete
quick_id: 260704-kmz
date: 2026-07-04
---

# Quick Task 260704-kmz Summary

## Outcome

Implemented a production-focused napplet benchmark for developer onboarding
tooling. The benchmark now evaluates a concrete napplet scenario across:

- scenario prompt capture
- installed `make-napplet` / `build-napplet` / `test-napplet` skill packet
- boilerplate scaffold command evidence
- candidate napplet workflow, accuracy, completeness, and bug count

This replaces the narrower scaffold-initialization benchmark direction. The
boilerplate package now uses the production benchmark in its unit smoke path.

## Benchmark Evidence

Baseline report:
`.planning/quick/260704-kmz-improve-developer-getting-started-around/baseline.md`

- Scenario: `outbox-latest-note`
- Development/tooling seconds: 3.162
- Workflow: 2/3 (0.667)
- Accuracy: 7/8 (0.875)
- Completeness: 8/8 (1)
- Bugs found: 2
- Caught gaps: missing skill packet and incomplete missing-domain fallback

Improved/reference report:
`.planning/quick/260704-kmz-improve-developer-getting-started-around/improved.md`

- Scenario: `outbox-latest-note`
- Development/tooling seconds: 3.175
- Workflow: 3/3 (1)
- Accuracy: 8/8 (1)
- Completeness: 8/8 (1)
- Bugs found: 0

## Changed Files

- `scripts/benchmark-napplet-production.mjs`
- `scripts/benchmark-napplet-production-checks.mjs`
- `benchmarks/napplet-production.md`
- `benchmarks/scenarios/outbox-latest-note.json`
- `packages/boilerplate/test-fixtures/basic-template/**`
- `packages/boilerplate/src/index.ts`
- `packages/boilerplate/package.json`
- `packages/boilerplate/README.md`
- `packages/skills/skills/make-napplet/SKILL.md`
- `packages/skills/skills/test-napplet/SKILL.md`
- `packages/skills/README.md`
- `apps/docs/guide/getting-started.md`
- `apps/docs/packages/boilerplate.md`
- `apps/docs/packages/skills.md`
- `.changeset/polite-benchmarks-produce-napplets.md`

## Verification

- `pnpm benchmark:creation -- --skip-skill-install --no-reference --allow-failures --out .../baseline.json --markdown .../baseline.md`
- `pnpm benchmark:creation -- --apply-reference --out .../improved.json --markdown .../improved.md`
- `node scripts/benchmark-napplet-production.mjs --skip-build --apply-reference --smoke`
- `python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py packages/skills/skills/make-napplet`
- `python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py packages/skills/skills/test-napplet`
- `pnpm --filter @napplet/boilerplate test:unit`
- `pnpm --filter @napplet/skills test:unit`
- `pnpm type-check`
- `pnpm build`
- `pnpm -r test:unit`
- `pnpm dlx aislop scan --changes --json .` (score 100)
- `git diff --check`

## Remaining Risks

- The included improved run uses deterministic `--apply-reference` mode to test
  the benchmark methodology. A live agent-run benchmark should use
  `--candidate <path>` against the napplet actually produced by an agent after
  following the installed skills.
