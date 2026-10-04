# Generated protocol directory

## Scope and decisions

Build /protocol/ and per-NAP detail pages in the existing Astro website. Keep the directory non-normative and source-linked: default-branch files determine merged status; open pull requests determine proposed changes; upstream registry status is shown independently, including deferred proposals. Do not reproduce full normative specs or infer adoption from a document's draft marker. Preserve the homepage's visual design and static directory routing.

The feature branch starts from current origin/main and incorporates the prerequisite showcase branch. Its PR is stacked on feat/astro-ecosystem-showcase until that PR merges.

## Tasks

1. Research the live registry, contributor rules, templates, merged files and open PRs. Implement a paginated GitHub reader and a deterministic metadata extractor with atomic output. Pin reads to observed commits, handle amendments, removals and legacy paths, escape untrusted content, and fail without replacing known-good data when upstream retrieval fails.
2. Generate a checked-in non-normative data snapshot, table, individual detail routes and contribution guide. Display provenance, freshness, merge/PR state and upstream status separately. Source contribution decision guidance from the README boundary rule, governance and template. Update the homepage NAP link and related user navigation.
3. Add package scripts to refresh data and generate the protocol site. Extend the existing deployment workflow with daily cron refresh, validation, site rebuild and Bunny deployment. Provide a build-only dispatch mode for verification. Scheduled refresh builds current data directly without requiring bot commits to protected main. Add CI, assembler and browser coverage for all generated routes.
4. Verify fixture-driven generator edge cases, real upstream completeness, idempotence, build/type-check/unit/AI-slop gates, static links, desktop/mobile/no-JS rendering, status labels, canonical URLs, and the scheduled workflow's full artifact. Commit green checkpoints, push, open PR and inspect CI.

## Acceptance audit

- /protocol/ has merged NAPs and all open NAP proposals, with readable status distinctions.
- Every row opens a detailed local page, then the merged GitHub spec or the proposal PR.
- Contribution guidance explains new capability vs convention, archetype or projection, with current source/template links.
- A root package script refreshes upstream metadata and builds the page; regular builds work offline from the checked-in snapshot.
- Cron runs refresh, validation, complete site rebuild and deployment, with API failure stopping deployment and old data preserved locally.
- Homepage NAP link, generated sitemap, assembled site and documentation agree.

## Plan review

Each requested deliverable maps to a task and direct verification. Additional edge cases: README registry lag, stale PR links, merged documents still marked draft, deferred tracks with open PRs, fork branches, multiple specs in one PR, pagination, closed/deleted proposals, and upstream text treated only as data. No protocol enforcement is added.
