# Review resolution

Read-only review checked draft fidelity, endpoint isolation, revision ordering, duplicate retained visits, retention, and host integration.

- P2: recording reset tombstoned live endpoints. Fixed reset to preserve endpoint identity and accepted history, clearing only recorded traffic and making dropped pending traversal uncertain. Regression test covers reuse and late reports.
- P1: sparse arrays caused proportional intermediate allocation during JSON validation. Replaced index-array allocation with short-circuit traversal. A billion-slot sparse array regression rejects promptly without allocating by its declared length.
- Final source verification: full build/types/recursive units pass, including224 conformance tests and34 conformance CLI tests. No unresolved source finding.
