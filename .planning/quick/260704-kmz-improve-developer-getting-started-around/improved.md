# Napplet Production Benchmark

Scenario: outbox-latest-note
Run: 2026-07-04T13:31:22.529Z
Agent: fixture
Condition: default-candidate
Prompt SHA-256: `f06fed10725f1c3340231cac22050889fb6e5038fd0b5fd17801916f14d291ba`
Candidate: `/home/sandwich/Develop/napplet/packages/boilerplate/test-fixtures/basic-template`

## Results

- Development seconds: 0.001
- Scoring seconds: 0.001
- Workflow: 3/3 (1)
- Accuracy: 9/9 (1)
- Completeness: 8/8 (1)
- Bugs found: 0

## Checks

| Check | Category | Result | Detail |
| --- | --- | --- | --- |
| static-prompt | workflow | pass | frozen one-shot prompt embeds the scenario |
| agent-condition | workflow | pass | condition=default-candidate |
| candidate-directory | workflow | pass | candidate directory supplied for scoring |
| package-json | completeness | pass | package.json exists |
| vite-config | completeness | pass | vite.config.ts exists |
| source-entry | completeness | pass | src/main.ts exists |
| readme | completeness | pass | README.md exists |
| build-script | completeness | pass | build=vite build |
| verify-script | completeness | pass | verify=pnpm build && pnpm test:conformance |
| conformance-script | completeness | pass | test:conformance=napplet-conformance ./dist |
| verification-guidance | completeness | pass | README explains candidate verification |
| package-name | accuracy | pass | name=benchmark-napplet |
| napplet-type | accuracy | pass | nappletType=benchmark-napplet |
| html-title | accuracy | pass | title=Latest Note |
| html-heading | accuracy | pass | heading=Latest Note |
| readme-title | accuracy | pass | README title=Latest Note |
| outbox-boundary | accuracy | pass | scenario reads through outbox, not raw relay |
| signed-out-fallback | accuracy | pass | missing outbox path has a user-visible fallback |
| latest-note-rendering | accuracy | pass | latest note content is rendered into the UI |
| forbidden-surfaces | accuracy | pass | no forbidden app-owned surfaces found |
