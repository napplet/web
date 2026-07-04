# Napplet Production Benchmark

Scenario: outbox-latest-note
Run: 2026-07-04T13:11:33.860Z
Candidate: `/tmp/napplet-production-benchmark-hXGZPr/candidate`

## Results

- Development seconds: 3.668
- Tooling seconds: 3.668
- Workflow: 3/3 (1)
- Accuracy: 8/8 (1)
- Completeness: 8/8 (1)
- Bugs found: 0

## Checks

| Check | Category | Result | Detail |
| --- | --- | --- | --- |
| skill-packet | workflow | pass | make/build/test skills installed for the scenario |
| scenario-prompt | workflow | pass | scenario prompt captured |
| scaffold-command | workflow | pass | scaffold command captured |
| package-json | completeness | pass | package.json exists |
| vite-config | completeness | pass | vite.config.ts exists |
| source-entry | completeness | pass | src/main.ts exists |
| readme | completeness | pass | README.md exists |
| build-script | completeness | pass | build=vite build |
| verify-script | completeness | pass | verify=pnpm build && pnpm test:conformance |
| conformance-script | completeness | pass | test:conformance=napplet-conformance ./dist |
| benchmark-guidance | completeness | pass | candidate points to benchmark evidence |
| package-name | accuracy | pass | name=benchmark-napplet |
| napplet-type | accuracy | pass | nappletType=benchmark-napplet |
| html-title | accuracy | pass | title=Latest Note |
| html-heading | accuracy | pass | heading=Latest Note |
| readme-title | accuracy | pass | README title=Latest Note |
| outbox-boundary | accuracy | pass | scenario reads through outbox, not raw relay |
| signed-out-fallback | accuracy | pass | missing outbox path has a user-visible fallback |
| forbidden-surfaces | accuracy | pass | no forbidden app-owned surfaces found |
