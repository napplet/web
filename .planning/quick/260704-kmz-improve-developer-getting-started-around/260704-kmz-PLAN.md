---
status: ready
must_haves:
  truths:
    - Benchmark methodology covers speed, workflow evidence, accuracy, completeness, and bug count.
    - Tooling runs against the current boilerplate generator, skills, and scenario output.
    - At least one benchmark run is documented before and after an improvement iteration.
  artifacts:
    - Root benchmark script and package command.
    - Boilerplate smoke fixture/test path.
    - Updated docs/skills explaining the benchmark.
    - Quick-task summary with verification evidence.
  key_links:
    - packages/boilerplate/src/index.ts
    - packages/skills/skills/make-napplet/SKILL.md
    - packages/skills/skills/test-napplet/SKILL.md
    - apps/docs/guide/getting-started.md
---

# Quick Plan 260704-kmz

## Task 1 - Add production benchmark tooling and smoke fixture

Files:
- `scripts/benchmark-napplet-production.mjs`
- `benchmarks/scenarios/outbox-latest-note.json`
- `packages/boilerplate/test-fixtures/basic-template/**`
- `packages/boilerplate/package.json`
- `package.json`

Action:
- Implement a no-new-dependency benchmark runner that builds or uses local
  boilerplate and skills CLIs, captures a scenario prompt and skill packet,
  produces or scores a candidate napplet, records timings, scores workflow,
  accuracy, and completeness, counts failed checks as bugs, and writes
  JSON/markdown reports.
- Make `@napplet/boilerplate` `test:unit` run the production benchmark in a fast
  reference-smoke mode.

Verify:
- `pnpm --filter @napplet/boilerplate build`
- `pnpm --filter @napplet/boilerplate test:unit`
- `pnpm benchmark:creation -- --out .planning/quick/260704-kmz-improve-developer-getting-started-around/baseline.json --markdown .planning/quick/260704-kmz-improve-developer-getting-started-around/baseline.md`

Done:
- Benchmark report contains development/tooling seconds, workflow score,
  accuracy score, completeness score, and bug count.

## Task 2 - Improve getting-started surfaces

Files:
- `packages/boilerplate/src/index.ts`
- `packages/boilerplate/README.md`
- `apps/docs/guide/getting-started.md`
- `apps/docs/packages/boilerplate.md`
- `packages/skills/skills/make-napplet/SKILL.md`
- `packages/skills/skills/test-napplet/SKILL.md`
- `packages/skills/README.md`
- `apps/docs/packages/skills.md`

Action:
- Add benchmark-aware next steps to the generator and docs.
- Teach the skills to use the benchmark as measurable completion evidence when
  creating or testing napplets.
- Keep language non-normative for protocol and scoped to local tooling.

Verify:
- Rerun the benchmark into `improved.json`/`improved.md`.
- Confirm docs mention the benchmark command and skill flow.

Done:
- The benchmark records one improvement iteration and docs/skills explain how to
  reproduce it.

## Task 3 - Final verification and summary

Files:
- `.planning/quick/260704-kmz-improve-developer-getting-started-around/260704-kmz-SUMMARY.md`
- `.planning/STATE.md`
- optional changeset

Action:
- Add a changeset if shipped package output changes.
- Run targeted and broad checks appropriate for the changed surfaces.
- Write the quick-task summary with benchmark results and remaining risks.

Verify:
- `pnpm --filter @napplet/boilerplate test:unit`
- `pnpm --filter @napplet/skills test:unit`
- `pnpm type-check`
- `git diff --check`

Done:
- Summary captures changed files, simplifications, benchmark evidence, and gaps.
