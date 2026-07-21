---
status: resolved
trigger: "A deploy uploaded successfully to two of three configured Blossom servers, but reported attention needed, skipped relay publication, and threw because one server returned HTTP 502. A deploy should fail only when no Blossom server received every required file."
created: 2026-07-11
updated: 2026-07-11
---

# Debug Session: blossom-partial-mirror-fails

## Symptoms

- Expected behavior: deployment proceeds to relay publication and succeeds when at least one
  configured Blossom server contains every required file.
- Actual behavior: one failed server among three marks the deploy failed, skips every relay
  publication, and throws even though two mirrors are complete.
- Error messages: one Blossom `PUT /upload` returned HTTP 502; the report ended with
  `Deploy finished with 1 failure(s).`
- Timeline: observed on the current `feat/cli-ux-parity` PR branch.
- Reproduction: deploy one napplet file to three Blossom servers where two uploads succeed and one
  returns 502.

## Current Focus

- hypothesis: confirmed — both relay publication and the CLI exit predicate use all-upload success,
  while `summarizeUploads` already computes the correct per-server completeness invariant.
- test: regressions cover two complete mirrors plus one HTTP failure, distributed uploads with zero
  complete mirrors, and warning-only human report wording.
- expecting: satisfied — partial redundancy publishes and succeeds; zero complete mirrors still
  skips publication and fails.
- next_action: commit the verified fix and update PR #162.

## Evidence

- timestamp: 2026-07-11T16:02:00+02:00 observation: `executeNetworkDeploy` returns before relay
  publication whenever `uploadSummary.failedUploads > 0`. implication: one unavailable redundant
  server suppresses all manifest events.
- timestamp: 2026-07-11T16:03:00+02:00 observation: `networkDeploySucceeded` requires every upload
  result to succeed, even though the upload summary records complete mirrors independently.
  implication: the CLI exits non-zero after any per-server upload failure.
- timestamp: 2026-07-11T16:04:00+02:00 observation: `renderDeployReport` adds every failed mirror
  upload to its fatal failure count, producing the reported `attention needed` and failure result.
  implication: report semantics also need to distinguish lost redundancy from total unavailability.
- timestamp: 2026-07-11T18:06:00+02:00 observation: pre-fix focused tests produced 16 passes and 2
  failures; partial mirrors yielded zero published events and the report stayed `attention needed`.
  implication: both reported behaviors were reproduced before implementation.
- timestamp: 2026-07-11T18:10:00+02:00 observation: the post-fix CLI suite passed 102/102, including
  the partial-mirror, zero-complete-mirror, and warning-report regressions. implication: the
  availability invariant and its negative boundary are locked together.
- timestamp: 2026-07-11T18:20:47+02:00 observation: independent re-review approved the final diff;
  `pnpm build`, `pnpm type-check`, and `pnpm test` passed; CLI tests passed 104/104; and
  `aislop` scored 100/100. implication: implementation, report/exit consistency, protocol-real
  regression fixtures, and repository-wide integration are verified.

## Eliminated

- hypothesis: the Blossom uploader throws directly on HTTP 502. reason: `uploadFileToServer` returns
  a failed `ServerUploadResult`; the later deploy predicates turn that recoverable mirror result
  into overall failure.

## Resolution

- root_cause: `executeNetworkDeploy` gated relay publication on zero failed upload attempts, and
  `networkDeploySucceeded` required every mirror upload to succeed. The human report independently
  counted recoverable redundant-mirror misses as fatal failures.
- fix: gate relay publication and overall upload success on
  `uploadSummary.serversFullyUploaded > 0`; retain each failed upload in diagnostics; classify those
  failures as warnings when another server is complete.
- verification: RED —
  `deno test --node-modules-dir=auto -A packages/cli/tests/deploy_network_test.ts packages/cli/tests/output_test.ts`
  produced 16 passed / 2 failed before source changes. GREEN —
  `deno task --cwd packages/cli test:unit` passed 104/104; `deno task --cwd packages/cli check`
  passed; targeted `deno lint` and `deno fmt --check` passed; `pnpm build`, `pnpm type-check`, and
  `pnpm test` passed; `aislop` passed at 100/100; independent review approved with no findings.
- files_changed: `packages/cli/src/deploy-network.ts`, `packages/cli/src/output.ts`,
  `packages/cli/tests/deploy_network_test.ts`, `packages/cli/tests/output_test.ts`,
  `.changeset/cli-ux-parity.md`, and this session.
