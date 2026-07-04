# Napplet Production Benchmark

This benchmark measures whether the developer tooling can produce a complete
napplet for a concrete scenario, not only initialize a template.

## Command

```bash
pnpm benchmark:creation -- --out benchmark.json --markdown benchmark.md
```

By default, the command applies a deterministic reference implementation so the
benchmark methodology itself should pass. Use `--candidate <path>` to score a
napplet produced by an agent or developer after using the skills. Use
`--no-reference --allow-failures` to record an honest scaffold/baseline run when
known gaps remain.

## Methodology

| Metric | How it is measured |
| --- | --- |
| Development speed | Seconds from `--started-at` when supplied; otherwise elapsed benchmark tooling time. |
| Workflow | Evidence that the scenario prompt, scaffold command, and napplet skill packet were present. |
| Implementation accuracy | Scenario-specific behavior and protocol-boundary checks on the produced napplet. |
| Completeness | Expected project files, build/verify/conformance scripts, and benchmark guidance. |
| Bug count | Number of failed workflow, accuracy, and completeness checks. |

The default scenario is `benchmarks/scenarios/outbox-latest-note.json`. It asks
for a small napplet that reads the latest kind 1 note through OUTBOX, provides a
missing-domain fallback, avoids app-owned relay/signing/network surfaces, and
keeps build plus conformance verification available.

Default mode builds local tooling, scaffolds a candidate from the local
boilerplate fixture, installs `make-napplet`, `build-napplet`, and
`test-napplet` into the benchmark workspace, applies a deterministic completed
implementation, and scores the candidate. Pass `--no-reference` to score the
scaffolded output as-is without the deterministic implementation.

## Output

The JSON report is intended for trend tracking. The markdown report is intended
for pull requests and planning artifacts. Both contain the same checks and
scores so regressions are inspectable.
