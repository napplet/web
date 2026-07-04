# Quick Task 260704-kmz: Improve developer getting started around boilerplate, testing, skills, and benchmark methodology/tooling for napplet creation - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning

<domain>
## Task Boundary

Improve getting started for developers, primarily around the boilerplate,
testing, and skills. The work must create a methodology and tooling to
benchmark napplet creation, run it, document the result, and make one iteration
based on the benchmark.

</domain>

<decisions>
## Implementation Decisions

### Benchmark shape
- Use deterministic, executable benchmarks that can run locally and in CI.
- Benchmark the production of a napplet from a scenario using boilerplate,
  skills, and surrounding tooling, not just template initialization.
- Measure development speed, skill workflow evidence, implementation accuracy,
  completeness, and detected bug count with transparent checks instead of
  subjective claims.

### Boilerplate testing
- Reuse the benchmark harness as real generator smoke coverage so
  `@napplet/boilerplate` tests production-relevant starter behavior, not only
  `--help`.

### Skills/docs
- Update agent-facing skills and developer docs so napplet creation workflows
  know how to run and interpret the benchmark.

### Protocol boundaries
- Benchmark checks must not invent protocol requirements. They can check local
  tooling outputs, skill packet availability, expected project files, package
  scripts, and scenario-specific app behavior against existing package surfaces.

</decisions>

<specifics>
## Specific Ideas

- Add a root benchmark command that emits JSON plus a short markdown report.
- Add a package-local fixture template for reproducible production-benchmark
  setup.
- Score methodology:
  - speed: wall-clock seconds from `--started-at` or benchmark tooling elapsed time
  - workflow: scenario prompt, scaffold command, and skill packet evidence
  - accuracy: scenario behavior and protocol-boundary checks
  - completeness: required project files and scripts
  - bugs: count of failed benchmark checks
- Run a baseline benchmark, improve one measured weakness, rerun, and record both.

</specifics>

<canonical_refs>
## Canonical References

- NIP-5D: https://github.com/nostr-protocol/nips/pull/2303
- NAPs track: https://github.com/napplet/naps
- Merged skills PR: https://github.com/napplet/web/pull/114

</canonical_refs>
