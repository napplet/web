# Napplet Production Benchmark

This benchmark measures whether the developer tooling can produce a complete
napplet for a concrete scenario through a one-shot agent run. It does not count
tool or skill installation as success.

## Command

```bash
pnpm benchmark:creation
```

The default command scores:

- prompt: `benchmarks/prompts/outbox-latest-note.md`
- scenario: `benchmarks/scenarios/outbox-latest-note.json`
- candidate: `packages/boilerplate/test-fixtures/basic-template`

Override the prompt, candidate, agent label, or condition when comparing real
one-shot agent runs:

```bash
pnpm benchmark:creation -- \
  --prompt benchmarks/prompts/outbox-latest-note.md \
  --candidate /path/to/agent-output \
  --agent codex \
  --condition skills \
  --started-at 2026-07-04T12:00:00Z \
  --out benchmark.json \
  --markdown benchmark.md
```

Every compared agent should receive the same prompt file. Use `--condition` to
label the cohort, for example `skills`, `no-skills`, or `docs-only`.

## Methodology

| Metric | How it is measured |
| --- | --- |
| Development speed | Seconds from `--started-at` when supplied; otherwise elapsed scoring time. |
| Workflow | Frozen prompt hash, declared agent/tooling condition, and supplied candidate evidence. |
| Implementation accuracy | Scenario-specific behavior and protocol-boundary checks on the produced napplet. |
| Completeness | Expected project files, build/verify/conformance scripts, and verification guidance. |
| Bug count | Number of failed workflow, accuracy, and completeness checks. |

The default scenario is `benchmarks/scenarios/outbox-latest-note.json`. It asks
for a small napplet that reads the latest kind 1 note through OUTBOX, provides a
missing-domain fallback, avoids app-owned relay/signing/network surfaces, and
keeps build plus conformance verification available.

To compare skills or tooling, run the same static prompt against multiple
conditions and score each resulting candidate with a different `--condition`
label. The benchmark reports the prompt SHA-256 so runs can be grouped by the
exact task text.

## Output

The JSON report is intended for trend tracking. The markdown report is intended
for pull requests and planning artifacts. Both contain the same checks and
scores so regressions are inspectable.
