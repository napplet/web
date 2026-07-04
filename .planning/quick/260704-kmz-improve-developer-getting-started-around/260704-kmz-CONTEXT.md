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
- Use an executable benchmark that can run locally and in CI.
- Materialize one frozen prompt for the agent, then score the candidate produced
  by that one-shot run.
- Label the agent/tooling condition (`skills`, `no-skills`, `docs-only`, etc.)
  so the benchmark measures skill/tool effectiveness in agent context, not
  whether skills were installed successfully.
- Measure development speed, workflow evidence, implementation accuracy,
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
  candidate availability, expected project files, package scripts, and
  scenario-specific app behavior against existing package surfaces.

</decisions>

<specifics>
## Specific Ideas

- Add a root benchmark command that emits JSON plus a short markdown report.
- Add a package-local fixture template for reproducible production-benchmark
  setup.
- Score methodology:
  - speed: wall-clock seconds from `--started-at` or scoring elapsed time
  - workflow: static prompt, condition label, and candidate directory evidence
  - accuracy: scenario behavior and protocol-boundary checks
  - completeness: required project files and scripts
  - bugs: count of failed benchmark checks
- Keep one report per compared condition. Do not use deterministic reference
  implementations as benchmark success evidence.

</specifics>

<canonical_refs>
## Canonical References

- NIP-5D: https://github.com/nostr-protocol/nips/pull/2303
- NAPs track: https://github.com/napplet/naps
- Merged skills PR: https://github.com/napplet/web/pull/114

</canonical_refs>
