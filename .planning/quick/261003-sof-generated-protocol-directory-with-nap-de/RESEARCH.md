# Source findings

Read on 2026-10-03: https://github.com/napplet/naps (README, AGENTS.md, NAP-WORD-TEMPLATE.md, recursive master tree, open PR list and representative changed-file lists) and https://github.com/nostr-protocol/nips/pull/2303.

- Default branch is master. Five NAP files are merged, including NAP-IDENTITY even though its README row still says Draft. NAP-SHELL's file also retains a draft marker. Repository presence, registry maturity, and PR draft state must remain distinct.
- Open PRs include new domains not yet registered in README and amendments to merged NAPs. Query changed files, not just PR titles or the README. NAP-RESOURCE's README points at an older PR while its current open proposal is #80.
- Deferred NAP-CLASS and NAP-CONNECT remain open PRs. README status must be surfaced; derived class subtracks inherit the explicitly deferred parent designation with attribution.
- README Boundary rule distinguishes runtime APIs (NAPs), message semantics (conventions), role names and boundaries (NAATs), and host bindings (projections). The contribution page is editorial navigation based on these distinctions, not a new protocol authority.
- Governance: fork, use the interface template under naps/, open a PR for community discussion; maintainer merge follows implementation and stabilization. AGENTS adds operation/schema tables, declared domain dependencies, security boundaries, adjacent registry updates, a changelog, and Summary/Changes/Downstream PR sections.
- Deploy site already rebuilds and assembles the complete static Bunny artifact. Add schedule and data refresh to this same workflow to avoid a second deployment path. The branch can be verified with workflow_dispatch deployment disabled.
