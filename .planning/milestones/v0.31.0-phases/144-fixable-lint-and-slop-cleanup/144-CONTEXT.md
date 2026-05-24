# Phase 144: Fixable Lint and Slop Cleanup - Context

**Gathered:** 2026-05-24
**Status:** Ready for execution

<domain>
## Phase Boundary

Remove scanner-reported fixable lint and AI-slop findings without changing public behavior: duplicate imports, unused type imports, leftover console diagnostics, duplicated central shim logic, decorative narrative comments, and trivial restating comments.

</domain>

<decisions>
## Implementation Decisions

- **D-01:** Use `aislop fix .` for mechanical fixable categories, then inspect the diff before committing.
- **D-02:** Remove unused type imports manually if the scanner fixer leaves any behind.
- **D-03:** Do not introduce new logging infrastructure; delete leftover `console.log`, `console.debug`, and `console.info` calls or convert only if an existing Vite diagnostic surface already exists.
- **D-04:** Collapse duplicated shim logic locally in `packages/shim/src/index.ts` without changing installed global shape.

### Agent's Discretion

- Exact commit split for mechanical and manual cleanup
- Whether a remaining comment is useful API/security rationale or removable narrative
- Scanner JSON log path under `/tmp`

</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` — LINT-01..04, SLOP-01..03
- `/tmp/napplet-143-aislop.json` — post-security-upgrade scanner baseline
- `packages/nub/src/relay/types.ts`
- `packages/shim/src/index.ts`
- `packages/nub/src/storage/shim.ts`
- `packages/nub/src/identity/shim.ts`
- `packages/nub/src/keys/shim.ts`
- `packages/vite-plugin/src/index.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

- Scanner reports 13 unused imports in NUB shims.
- Scanner reports duplicate `@napplet/core` imports in `packages/nub/src/relay/types.ts` and `packages/shim/src/index.ts`.
- Scanner reports six console leftover calls in `packages/vite-plugin/src/index.ts`.
- Scanner reports six trivial comments and 255 narrative/decorative comments across core, nub, shim, and vite-plugin sources.
- Scanner reports a duplicated 10-line block in `packages/shim/src/index.ts`.

</code_context>

<specifics>
## Specific Ideas

- Run `pnpm dlx aislop fix .` first.
- Re-run the scanner and query only Phase 144 rules.
- Review all source diffs before deciding whether manual patches are needed.
- Run `pnpm -r type-check`, `pnpm -r build`, and `pnpm -r test:unit` after cleanup.

</specifics>

<deferred>
## Deferred Ideas

- `as any`, double assertions, long functions, and oversized files are owned by Phases 145-146.

</deferred>

---

*Phase: 144-fixable-lint-and-slop-cleanup*
*Context gathered: 2026-05-24*
