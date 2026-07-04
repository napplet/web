# Napplet Production Benchmark

Scenario: outbox-latest-note
Run: 2026-07-04T13:11:33.839Z
Candidate: `/tmp/napplet-production-benchmark-XLxn2k/candidate`

## Results

- Development seconds: 3.71
- Tooling seconds: 3.71
- Workflow: 2/3 (0.667)
- Accuracy: 7/8 (0.875)
- Completeness: 8/8 (1)
- Bugs found: 2

## Checks

| Check | Category | Result | Detail |
| --- | --- | --- | --- |
| skill-packet | workflow | fail | benchmark workspace lacks installed napplet skills |
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
| signed-out-fallback | accuracy | fail | missing-domain or signed-out fallback is incomplete |
| forbidden-surfaces | accuracy | pass | no forbidden app-owned surfaces found |

## Improvement Candidates

- skill-packet: benchmark workspace lacks installed napplet skills
- signed-out-fallback: missing-domain or signed-out fallback is incomplete
