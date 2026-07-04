---
status: complete
quick_id: 260704-kmz
date: 2026-07-04
---

# Quick Task 260704-kmz Summary

## Outcome

Implemented an agent-focused napplet benchmark for developer onboarding tooling.
The root package benchmark now runs Codex against the frozen one-shot prompt by
default, then evaluates the produced candidate across:

- static prompt hash
- agent completion/timeout status
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
- Prompt SHA-256: `cdf24bc9818b974aff4b1e92b9912f60ebcf2d15eba65e2e0ecc56ddc9b023b9`

Verified no-placeholder live command:

```bash
rm -rf /tmp/napplet-benchmark-timeout-smoke /tmp/napplet-benchmark-timeout-smoke.json /tmp/napplet-benchmark-timeout-smoke.md
pnpm benchmark:creation -- --candidate /tmp/napplet-benchmark-timeout-smoke --out /tmp/napplet-benchmark-timeout-smoke.json --markdown /tmp/napplet-benchmark-timeout-smoke.md --agent-timeout 5 --allow-failures
```

- Result: exited 0 in 5.388s
- Report files: `/tmp/napplet-benchmark-timeout-smoke.json`, `/tmp/napplet-benchmark-timeout-smoke.md`
- Agent evidence: `agent timed out after 5s; scored partial candidate`
- Candidate evidence: `/tmp/napplet-benchmark-timeout-smoke/BENCHMARK_PROMPT.md`

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
- `pnpm benchmark:creation -- --candidate /tmp/napplet-benchmark-timeout-smoke --out /tmp/napplet-benchmark-timeout-smoke.json --markdown /tmp/napplet-benchmark-timeout-smoke.md --agent-timeout 5 --allow-failures`
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

- The included planning report uses a committed fixture candidate for stable
  smoke proof; the live timeout smoke proves the package command invokes Codex
  and writes report files even when the agent does not finish in time.
