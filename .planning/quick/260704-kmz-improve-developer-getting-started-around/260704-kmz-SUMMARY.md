---
status: complete
quick_id: 260704-kmz
date: 2026-07-04
---

# Quick Task 260704-kmz Summary

## Outcome

Implemented an agent-focused napplet benchmark for developer onboarding tooling.
The benchmark now evaluates the candidate produced from a frozen one-shot prompt
across:

- static prompt hash
- declared agent/tooling condition
- supplied candidate directory evidence
- candidate napplet workflow, accuracy, completeness, and bug count

This replaces the invalid install/scaffold-focused benchmark direction. The
boilerplate package now uses the production benchmark against a candidate
fixture in its unit smoke path.

## Benchmark Evidence

Static prompt:
`benchmarks/prompts/outbox-latest-note.md`

- Scenario: `outbox-latest-note`
- Prompt SHA-256: `f06fed10725f1c3340231cac22050889fb6e5038fd0b5fd17801916f14d291ba`

Candidate scoring report:
`.planning/quick/260704-kmz-improve-developer-getting-started-around/improved.md`

- Scenario: `outbox-latest-note`
- Agent: `fixture`
- Condition: `default-candidate`
- Development/scoring seconds: 0.001
- Workflow: 3/3 (1)
- Accuracy: 9/9 (1)
- Completeness: 8/8 (1)
- Bugs found: 0

Invalidated prior evidence:
- Removed `baseline.json`/`baseline.md` because those reports measured missing
  skill installation and scaffold/reference behavior, not one-shot agent
  implementation accuracy.

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
- `benchmarks/prompts/outbox-latest-note.md`
- `.changeset/polite-benchmarks-produce-napplets.md`

## Verification

- `pnpm benchmark:creation -- --out .../improved.json --markdown .../improved.md`
- `node scripts/benchmark-napplet-production.mjs --smoke`
- `node scripts/benchmark-napplet-production.mjs --prompt benchmarks/prompts/outbox-latest-note.md --candidate packages/boilerplate/test-fixtures/basic-template --agent fixture --condition skills --smoke`
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

- The included report uses a committed fixture candidate as the smoke proof. A
  live comparison still needs separate one-shot agent runs for each condition
  being compared, then `--candidate <path>` scoring for each output.
