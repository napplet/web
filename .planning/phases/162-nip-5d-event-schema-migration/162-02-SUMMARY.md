# Plan 02 execution checkpoint

CLI current/legacy format selection implemented, current default for unattended deploys and terminal selection with current default. Legacy path/hash serialization isolated in manifest-legacy.ts; existing helper computeAggregateHash retained as an explicit legacy utility. Current upload list includes index.html and any locally available declared icon. Plugin metadata handoff supports current and legacy sidecars; config overrides preserved. Snapshots copy content and metadata and omit d.

Added offline napplet migrate for signed JSON: signature verification, unmodified original, explicit optional-domain mapping, description override, ambiguous multi-file rejection, unsigned preview with source provenance. Output file creation refuses overwrite. No event signing/publication is performed by migration.

Verification: CLI 128 tests pass, plugin 30 tests pass, CLI type-check passes. Final full gates, documentation and release remain plan 03. Current outputs have artifactHash; aggregateHash is only populated for legacy output. User-visible legacy-only shell and ACL/storage implications remain required documentation.
