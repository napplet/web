# NIP-5D event schema migration

User objective: update packages to current NIP-5D events, default CLI deployment to current format with an explicit temporary legacy option, migration guidance and agent skills, release cutoff, green build/type/unit/slop gates, draft PR with hzrd149 requested as reviewer. Publication of user events is not part of implementation verification.

## Decisions

- D-01: Current schema is the default; legacy serialization is isolated within the CLI for later removal. Noninteractive deploys default current; interactive deploys offer current/legacy.
- D-02: Preserve existing configuration and package helper names where possible. Configuration names are implementation options, not wire tags.
- D-03: Add a local event migration command producing a reviewable unsigned template; preserve originals and require signature verification for imported events. Re-signing/publishing is explicit subsequent work, never automatic during migration.
- D-04: Documentation explains storage/ACL identity changes and legacy pointers. No silent legacy fallback in current conformance readers.
- D-05: Infer per-package minor releases from current main because 0.x event contracts change; record exact cutoff table after changeset versioning.

## Authority

Non-normative implementation notes. [NIP-5D PR #2303](https://github.com/nostr-protocol/nips/pull/2303), live head b9d1ab17eb695fca90d800b7b0f93ca0f6578874 inspected via GitHub API on 2026-10-04. Manifest and Identity sections define unchanged kinds, exactly one lowercase artifact x hash, required plain-text content, z/i, R/O, optional icon and snapshot lineage. [NAP track](https://github.com/napplet/naps) remains authority for domain operations. No protocol surface is invented.
