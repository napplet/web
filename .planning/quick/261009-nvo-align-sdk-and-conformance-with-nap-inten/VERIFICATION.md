# Verification

Verified on 2026-10-09. This report is non-normative; authority remains the living [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303), [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md), [web projection](https://github.com/napplet/naps/blob/master/projections/web.md), [NAP-SHELL](https://github.com/napplet/naps/blob/master/naps/NAP-SHELL.md), [NAP-INC](https://github.com/napplet/naps/blob/master/naps/NAP-INC.md), [NAP-THEME](https://github.com/napplet/naps/blob/master/naps/NAP-THEME.md), and [NAP-IDENTITY](https://github.com/napplet/naps/blob/master/naps/NAP-IDENTITY.md).

| Check | Result |
|---|---|
| pnpm install --frozen-lockfile | PASS |
| pnpm build | PASS, 12 tasks |
| pnpm type-check | PASS, 17 tasks |
| pnpm -r test:unit | PASS, 568 tests across reported suites |
| pnpm test | PASS: JSR exports, release tooling, skills, unit suites, tutorial |
| pnpm --filter @napplet/conformance-e2e test:e2e | PASS, 5 browser tests |
| pnpm test:onboarding-contracts | PASS, 5 tests |
| pnpm test:workflow-contracts | PASS, 4 tests |
| pnpm test:convention-contracts | PASS, 5 tests and repository contract scan |
| pnpm dlx aislop@0.12.0 scan --json | PASS, score 100, 290 supported files, zero diagnostics |
| pnpm audit --json | Zero vulnerabilities |
| git diff --cached --check | PASS |

Coverage includes request normalization before traffic, literal plus and decoded duplicate query names, malformed URI/pointers, kind/publisher/d-tag preservation, query/payload exclusion, immediate acceptance and malformed result handling, ordered retained delivery and teardown, exact z/i contract matching, catalog identity across event kinds and revisions, explicit-handler refusal without fallback, endpoint provenance, optional readiness with first-snapshot retention, calls before readiness, revoked domain delivery, and non-parent message rejection.

Tutorial conformance reports 5 passed, 0 failed, and 6 skipped. The tutorial fixture does not provide a signed manifest event, live protocol traffic capture, or measured lifecycle teardown for those checks; skipped checks are not counted as passes. The separate browser conformance suite passes all 5 tests.

The reference catalog accepts metadata already verified by its caller. It is fixture policy, not a production manifest verifier, discovery service, or lifecycle manager. Recommendations may be ignored under that policy, as allowed by the published recommendation model.
