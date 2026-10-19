---
status: complete
commit: 5132679b
pr: https://github.com/napplet/web/pull/250
---

# YAML configuration migration

The user confirmed YAML. New configuration uses `.napplet/config.yaml`; custom `.yaml` and `.yml` paths are supported. YAML Document updates preserve comments on unchanged settings. Migration requires consent, saves exact original JSON bytes, refuses conflicting files, and resumes after interrupted writes. Refusal exits with `Cannot continue without migrating`. CI, redirected input, JSON-output mode, and `-i` require explicit `--migrate-config` approval.

The work uses an isolated worktree on `feat/cli-config-yaml`. Original-checkout WIP and open PRs #248/#249 were not absorbed. No protocol surface changed. A minor CLI changeset accompanies the format compatibility change.

## Acceptance evidence

| Requirement | Evidence |
| --- | --- |
| YAML reads/writes, validation, comments, custom paths | `config_storage_test.ts`, `config_test.ts` |
| Consent, refusal, cancellation, automation, command gating | `config_migration_test.ts` |
| Exact backup, conflict refusal, partial migration recovery, concurrent edit detection | `config_migration_test.ts` |
| Compiled binary behavior | Standalone migration test; QuickJS PTY tests for `n`, Enter, and `y` |
| Deployment/signing integration | Updated deploy, Zapstore, keys, and standalone tests |
| Documentation and fixtures | README, package docs, guides, skills, tutorial fixture and onboarding contract |
| Open PR | https://github.com/napplet/web/pull/250 |

## Verification

- `pnpm build`: 12 tasks passed, including five release compilation targets.
- `pnpm type-check`: 18 tasks passed.
- `pnpm -r test:unit`: passed; CLI has 208 passing tests and three opt-in tests skipped in the default run.
- Workflow contracts: six passed. Skills contracts: ten passed. Onboarding contracts: five passed.
- Tutorial build and conformance: passed. JSR exported-file checks: passed.
- QuickJS with dependency pruning: compilation and standalone smoke suite passed with an empty host-tool PATH. The suite covers screenshots, signing, deployment, conformance, Paja, cache reuse, and migration.
- Real terminal checks: `n` and Enter return 1 without modifying files; `y` returns 0, creates YAML and an exact JSON backup, then continues the original command.
- AI-slop scan: 98/100, zero errors, two existing warnings in `packages/cli/src/output.ts` and `packages/conformance/src/run/boot.ts`. Baseline source scan confirms both; no rule disabled.
- GitHub checks for implementation commit `5132679b`: all green, including standalone tests on Ubuntu x86_64/ARM64, macOS Intel/ARM64, and Windows x86_64.

Deno compilation can prune unrelated historical entries from the shared lockfile. The committed lockfile retains those entries and adds only the YAML dependency and CLI workspace references.
