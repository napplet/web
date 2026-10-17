# Capability metadata guidance

Corrected design guidance that told authors to omit optional manifest declarations. Design/build now maintain both explicit lists, including guarded integrations. Test guidance inspects current-format dry-run and signed events, and flags dropped or reclassified metadata. A constrained generator should use its documented metadata surface and flag its absence.

Canonical NIP-5D Manifest and Required and Optional Capabilities sections reviewed at PR 2303 head 5560820fa4f37f45b8ab742a11aeb3001b17dc67. No protocol or package runtime changes.

Validation: pnpm build, pnpm type-check, pnpm -r test:unit and 11 skills-contract checks passed. AI-slop 0.12.0 changed-file scan scored 98/100 with zero errors and one external dependency advisory; above the repository CI minimum of 70. No dependency change or rule suppression. PR prepared for review, not merged.
