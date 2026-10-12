# Chase the NAP-INTENT cascade

Non-normative implementation plan. Protocol authority remains the living [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303), [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md), [web projection](https://github.com/napplet/naps/blob/master/projections/web.md), and sibling NAP documents. Research inspected NAPs master e5308ac and NIP-5D head 020cb8b; these revisions record provenance, not a pinned protocol fork.

## 1. INTENT API and delivery

Update core types, NAP bindings, SDK wrappers, runtime namespace, envelope validation, and reference shell. Derive requests from URI; support web-projection handlerHint extraction using NIP-19; replace handled/windowId with acceptance results; add buffered onDelivery; expose catalog id/contracts from z/i metadata. Verify malformed URI rejection, immediate correlation, delayed delivery, retained delivery, exact contracts, and publisher/kind distinctions.

## 2. Cascade domains

Implement the newly optional NAP-SHELL readiness API without gating other domains (NAP-SHELL API Surface and Shell Behavior). Update INC attestation to endpoint identifiers (NAP-INC schemas and Endpoint identifiers). Verify theme delivery is bounded by domain exposure and identity changes remain user identity only; retain graceful optional resource behavior. Update export maps, build entries, and conformance catalog for the canonical wire surface.

## 3. Ship

Update every affected README, docs example, skill, and contract test; add release metadata for changed shipped output. Run pnpm build, pnpm type-check, pnpm -r test:unit, relevant root contract/tutorial/e2e tests, git diff --check, and AI-slop with target 100. Preserve the existing slop configuration. Commit checkpoints, push, and open a PR with canonical citations and verification evidence.

## Spec conflict

NAP-INTENT #99 duplicated IntentInvokeOptions and retained fragment rejection in the normalization paragraph; it also describes explicit handler addresses where the catalog-identifiers section still requires opaque runtime identifiers. The explicit web projection defines request.handlerHint and URI naddr recommendations. Implement that documented field and preserve catalog selection semantics; flag the editorial contradictions in the PR. Do not invent missing wire types or enforce undocumented restrictions.

## Acceptance

The requested full cascade is implemented and covered by updated tests; all required gates pass; slop score is 100; the PR is open. No unrelated local files enter the PR. Plan checked inline against canonical sections before implementation.

## Gate cleanup

The complete repository slop scan exposed existing CLI file-size warnings, a release metadata orchestration warning, and transitive dependency advisories. Extract existing helpers without changing their original exports or behavior, verify with CLI and release fixture tests, and upgrade Changesets plus patched Vue/source-map-js dependency lines. No advisory exceptions or rule disables are planned.
