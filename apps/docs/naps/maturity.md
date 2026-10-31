# NAP maturity and opt-in

This is non-normative implementation guidance for the `@napplet/*` packages. The living [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303) and [NAP proposals](https://github.com/napplet/naps) govern protocol behavior. These labels are our implementation assessments, not official governance stages, security certifications, or compatibility guarantees. All NAP capabilities remain subject to change.

## Two separate signals

**Proposal status** records the upstream state at the date shown in `proposal.checkedAt`: `merged`, `in-review`, `draft` (a GitHub draft PR), or `unknown`. It describes the linked proposal, not every amendment to that domain. A merged document can still call itself a draft. A reverted merge does not make a reopened proposal merged.

**Implementation maturity** describes this package's implementation:

- **supported**: maintained and tested for ordinary integration; its API is not frozen.
- **experimental**: implemented for deliberate evaluation; substantial changes remain likely.
- **exploratory**: early implementation intended to explore a published draft.

A missing classification is excluded by the selection helper. Deferred or rejected proposals are retired rather than offered as another opt-in tier. Experimental status never waives protocol conformance requirements.

## Inspect installed-package metadata

```ts
import { NAP_IMPLEMENTATIONS, getNapImplementation } from '@napplet/core';

const llm = getNapImplementation('llm');
console.log(llm?.maturity, llm?.proposal.url, llm?.proposal.checkedAt);
console.log(NAP_IMPLEMENTATIONS.storage.rationale);
```

Metadata is bundled at release time. It makes no runtime GitHub requests and does not identify a remote shell's supported protocol revision. An optional `implementationReference` records an upstream revision, the repository evidence, and the scope of a historical implementation verification. It does not claim that the whole current implementation matches that revision; later changes are outside the recorded scope. Missing provenance stays missing; a fetched head SHA alone is not verification. The linked living proposal remains authoritative, even when a historical verification revision is recorded.

## Select supported domains

Supply only domains that the host implements and has authorized for this napplet. The helper filters those candidates; it never discovers host support, grants permission, or adds a domain.

```ts
import { selectNapDomains } from '@napplet/core';
import { renderNappletRuntimePreludeCall } from '@napplet/shim/prelude';

const selection = selectNapDomains({
  candidates: ['storage', 'identity', 'llm'],
});
// selection.domains: ['storage', 'identity']
// selection.excluded explains why llm was omitted.

const activate = renderNappletRuntimePreludeCall({ domains: selection.domains });
```

Inline the maintained `@napplet/shim/prelude.global` artifact followed by `activate` before any napplet scripts run. The [shim guide](/packages/shim) shows the complete injection pattern.

## Opt into one experiment

```ts
const selection = selectNapDomains({
  candidates: ['storage', 'llm', 'ble'],
  optIn: ['llm'],
});
// ['storage', 'llm']; ble remains excluded.
```

An opt-in is intersected with candidates. Opting into `llm` cannot activate it when the host did not include it. Adding another experimental implementation in a package upgrade does not activate it through this opt-in.

`allowedMaturities` defaults to `['supported']`. An explicit empty array allows only named opt-ins. A broader list such as `['supported', 'experimental']` is possible, but admits future candidate domains classified at those levels. Prefer named opt-ins when upgrades must not enable new experiments automatically. Classifications can also change between releases; review catalog changes during upgrades.

The selector returns `domains` and `excluded`. Exclusion reasons are `unknown-domain`, `unclassified`, and `maturity-not-allowed`. Inputs are not mutated; results are deduplicated in candidate order.

## Enforce the same decision in the host

Shim filtering is not a security boundary: a napplet can send `postMessage` directly. Apply `selection.domains` to the endpoint's host dispatch allowlist as well as namespace injection. Keep source identity checks, per-operation authorization, and domain-specific requirements in place. Selection does not automatically enable dependency domains.

The repository's reference mock supports the same pattern:

```ts
import { createReferenceShell } from '@napplet/conformance';

const shell = createReferenceShell({ domains: selection.domains });
// Attach this mock only to the authenticated test endpoint.
// Both handle() and handleFrom() enforce the host domain ceiling.
```

For browser evaluation, `bootAndCollect` accepts `domains` and an optional `maturity` policy. It resolves that policy before boot and passes the same domains to the prelude and reference dispatcher. Its normal conformance mode keeps all domains enabled so experimental APIs still receive full protocol checks. Local policy exclusion does not turn a valid envelope into a conformance failure.

## Prelude compatibility

`@napplet/shim/prelude` has no install-on-import side effect. Its existing explicit `domains` behavior remains unchanged when `maturity` is omitted. Passing `maturity: {}` enables supported-only filtering; `maturity: { optIn: ['llm'] }` adds that named candidate exception. Rendering resolves policy on the host and sends only the selected domain list into the prelude.

The legacy root `@napplet/shim` entrypoint still installs every bundled domain on import for compatibility. Do not use it for policy-controlled injection. If it was already imported during host setup, the explicit prelude replaces the namespace with the selected set; it does not retroactively undo earlier initialization or calls. Complete policy selection before napplet code runs and enforce the selected set in host dispatch.

## Required and optional domains

This explanation defers to NIP-5D's **Required and Optional Capabilities** and **Runtime Domain Availability** sections. Check the complete manifest `R` set against the domains the shell can expose after policy selection. A missing required domain means the shell should reject loading or warn that full functionality is unavailable. Missing `O` domains alone do not prevent loading. Neither declaration grants access. Napplets check namespace presence and gracefully degrade or stop using absent domains.

Maturity is not encoded in the manifest, HTML tags, injected namespace, or wire envelopes. Any interoperable semantic compatibility checks or negotiation belong in the relevant NAP first.

## Maintaining classifications

Edit `packages/core/src/nap-catalog.ts` with evidence from implementation tests, real integration, known design uncertainty, and upstream discussion. Verify the linked proposal's current state and update its check date. Do not infer implementation maturity from PR merge state alone. The core type contract and coverage test require metadata for every shipped domain; domain overview tables and page notices render directly from this catalog during docs builds.

Promotions and demotions are reviewable package changes. Record why the evidence changed, update tests and release notes, and retire implementations whose proposals are deferred or rejected according to repository policy. No new release channel is required.

### Scheduled upstream checks

The **NAP metadata review** GitHub Actions workflow checks upstream daily at 05:43 UTC and supports **Run workflow** on the default branch. It maintains one draft PR on `chore/nap-proposal-refresh`. The schedule starts after the workflow is merged into the default branch. Run the same check locally with `GH_TOKEN=… pnpm refresh:nap-maturity` using a token that can read the public NAP repository.

The updater refreshes proposal status and its check date when an observation changes. It detects open proposal head changes, later edits or removals of merged NAP files, and registry status changes. Unchanged daily checks produce no commits, check-date changes, or package bumps; the workflow summary records successful polling. The catalog date therefore records the last committed observation, not the latest cron execution. API errors, missing data, or a proposal changing during collection fail the run before local files are updated.

`scripts/data/nap-proposal-observations.json` contains observed heads and file revisions solely for change detection. These revisions are not implementation verification references or normative pins. The updater never changes implementation maturity, rationale, evidence, or `implementationReference`. A closed unmerged PR becomes `unknown` and triggers a retirement review; removals and definite deferred/rejected registry states also receive explicit warnings. Maintainers must investigate and retire dependent surface under AGENTS.md before accepting a retirement change. The bot does not perform that sweep or change runtime availability.

Review the generated report in `scripts/data/nap-proposal-review.md`, inspect changed upstream contracts, and decide whether implementation changes or a separate follow-up are needed. Merging an observation PR acknowledges its baseline; it does not certify implementation compatibility. A shipped catalog change includes a core patch changeset. Follow the usual release-metadata procedure before shipping; no bot job merges or publishes packages. Observation-only updates need no package release. Docs render merged catalog changes on the next site build, and installed packages receive them through ordinary releases.

Repository Actions settings must allow GitHub Actions to create pull requests. The workflow uses `GITHUB_TOKEN` by default and validates build, types and units itself because PRs created with that token do not trigger the usual PR workflows. To trigger normal PR checks automatically, configure the optional `NAP_MATURITY_BOT_TOKEN` Actions secret with a dedicated fine-grained token that can write repository contents and pull requests. Without it, a maintainer must arrange the required PR checks before merging. If a scheduled run fails, inspect its logs and rerun it after fixing API access or source mapping; no partial upstream read is committed. The fixed bot branch is managed by the updater, so put implementation fixes on a separate branch or pause the workflow while editing that branch.
