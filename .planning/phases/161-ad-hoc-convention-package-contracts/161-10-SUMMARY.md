---
phase: 161-ad-hoc-convention-package-contracts
plan: "10"
subsystem: release-verification
tags: [changesets, verification, code-review, pull-request, upstream-drafts]
requires:
  - phase: 161-01..26
    provides: Adopted convention and intent implementation, guidance, and active-surface guard.
provides:
  - Complete release metadata for every changed publishable package.
  - Full repository, security, documentation, review, and goal-verification evidence.
  - Published downstream pull request and updated ambiguity tracking issue.
affects: [release, pull-request, napplet-web-183]
key-files:
  created:
    - .planning/phases/161-ad-hoc-convention-package-contracts/161-REVIEW.md
    - .planning/phases/161-ad-hoc-convention-package-contracts/161-REVIEW-FIX.md
    - .planning/phases/161-ad-hoc-convention-package-contracts/161-REVIEW-2.md
    - .planning/phases/161-ad-hoc-convention-package-contracts/161-VERIFICATION.md
  modified:
    - .changeset/ad-hoc-convention-contracts.md
    - .changeset/ad-hoc-convention-guidance.md
    - pnpm-workspace.yaml
    - pnpm-lock.yaml
requirements-completed: [CONV-PKG-01, CONV-PKG-02, CONV-PKG-03, CONV-PKG-04, CONV-PKG-05, CONV-PKG-06]
metrics:
  completed: 2026-07-23
status: complete
---

# Phase 161 Plan 10: Release Verification and PR Summary

The Napplet downstream now implements the proposed PR #89-#91 convention and
intent contract, has complete release metadata, passes every required gate, and
is published for review as [napplet/web#186](https://github.com/napplet/web/pull/186).

## Upstream Provenance

The release gate revalidated all three upstream pull requests immediately before
publication. Each remained open, draft, and at the planned head:

- Upstream baseline: `napplet/naps@6461e4b37c29dc09a20dff35d9515889c4433874`
- NAP-INC #89: `4593ce9e301ce098fd3dad64206fcd6f144fa7af`
- Governance/web projection #90: `896c32c92deee68dc4d10fc1132b62df20cccb6f`
- NAP-INTENT #91: `a718915ddefa2f03a0126579601f59d8bd86f7c4`

The adopted downstream split is exact queryless identity, invocation-boundary
query transposition, runtime-attested sender, acceptance-only intent results,
source-independent no-ID delivery, and queryless per-contract discovery with
optional same-tag event kinds.

## Release Metadata

The revised changesets form a bijection with the changed publishable packages:

- Minor: `@napplet/cli`, `@napplet/conformance`, `@napplet/core`,
  `@napplet/nap`, `@napplet/sdk`, `@napplet/shim`, and
  `@napplet/vite-plugin`.
- Patch: `@napplet/boilerplate`, `@napplet/conformance-cli`, and
  `@napplet/skills`.
- `@napplet/conformance-web` receives the expected induced patch from internal
  dependency propagation.

Commit `2182f59c` revised the release entries to the final adopted contract.

## Verification Evidence

The final gate ran at the reviewed source state and passed:

- `pnpm build`
- `pnpm type-check`
- `pnpm test`, including the recursive unit suite, JSR export check, and
  materialized tutorial build/conformance run
- `pnpm test:conformance` — 6 passed, 0 failed, 4 skipped
- `pnpm test:convention-contracts` — 5 guard fixtures plus the live active scan
- `pnpm lint` — command passed; the repository currently defines no lint tasks
- `pnpm audit --audit-level=high` — no known vulnerabilities
- `pnpm dlx aislop@0.12.0 scan --changes --base origin/main .` — zero errors;
  remaining warnings are file/function size and narrative-comment heuristics
- `pnpm exec changeset status`
- `git diff --check origin/main...HEAD`

The assembled production-shaped web/docs output was served from a temporary
directory and crawled with Playwright on port `18101`: 23 internal URLs checked,
with no broken links. Port `8099` was already occupied by unrelated local
services, so the same repository checker ran on the isolated alternate port.

Focused regressions additionally prove URI decoding/rejection, exact INC
routing, FIFO early intent delivery, endpoint sender attestation, forged intent
request rejection, optional same-tag event kinds, config-schema explicit
registration, and the absence of HTML metadata opt-outs.

## Review and Goal Verification

The first independent GSD code review found two blockers and one warning:

1. invented active `napplet-*` HTML manifest metadata;
2. conformance acceptance of malformed or forged normalized intent requests;
3. three emit/subscribe examples with mismatched exact topics.

The fixes landed in `9442e11d`, `dd4819b5`, `eed45856`, `13b89bcd`, and
`fc85f3ce`, with new regressions. A repository-wide follow-up retired HTML
config-schema discovery and the standalone metadata opt-out while preserving
explicit `config.registerSchema` and signed manifest-event behavior.

The second independent review inspected 100 files and reported zero critical,
warning, or info findings. Goal-backward GSD verification passed 11/11
observable truths and satisfied `CONV-PKG-01` through `CONV-PKG-06`.

## Security Gate Deviation

The first AI-slop run exposed newly published transitive advisories in
`js-yaml` and `postcss`. The repository now pins compatible patched versions:

- `read-yaml-file > js-yaml` to `3.15.0`
- `@changesets/parse > js-yaml` to `4.3.0`
- `postcss` to `8.5.22`

The lockfile was regenerated, the dependency tree was reinstalled, the audit
became clean, and the complete repository gate was rerun. No security rule or
allowlist was suppressed.

## Publication and Tracking

- Branch: `feat/ad-hoc-nap-schemes`
- Pull request: [napplet/web#186](https://github.com/napplet/web/pull/186)
- Tracking issue: [napplet/web#183](https://github.com/napplet/web/issues/183)
- Tracking update:
  [issue comment](https://github.com/napplet/web/issues/183#issuecomment-5061607872)

The issue remains open while upstream PRs #89, #90, and #91 are draft/unmerged
and until downstream PR #186 lands.

## Workspace Isolation

`packages/cli/dist-bin/` and `workshop/` are absent from the committed diff.
The unrelated local `.planning/config.json` modification and both untracked
directories remain untouched.

## Self-Check: PASSED

- Changesets cover every changed publishable package.
- Full repository and release gates pass without exceptions.
- Clean independent re-review and 11/11 goal verification are recorded.
- The branch is pushed, PR #186 is open, and issue #183 links the downstream
  adoption.
- Excluded local workspace paths are not committed.

---
*Phase: 161-ad-hoc-convention-package-contracts*
*Completed: 2026-07-23*
