# Phase 146: Complexity Hotspot Split - Context

**Gathered:** 2026-05-24
**Status:** Ready for execution

<domain>
## Phase Boundary

Split low-risk long functions reported by the scanner and record exact deferrals for oversized public type/barrel files that should not be repartitioned casually during a scanner cleanup.

</domain>

<decisions>
## Implementation Decisions

- **D-01:** Split `normalizeConnectOrigin` into focused helpers while preserving the existing normalizer and aggregate-hash tests.
- **D-02:** Split Vite plugin schema-walk and plugin-hook bodies into local helpers without changing emitted tags, manifest ordering, or signing behavior.
- **D-03:** Treat public oversized type/barrel files as explicit deferrals unless a safe internal-only split is obvious.

### Agent's Discretion

- Helper names and exact extraction boundaries
- Deferral wording for large public API files

</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` — QUAL-01..04
- `/tmp/napplet-145-aislop.json` — post-Phase-145 scanner baseline
- `packages/nub/src/connect/types.ts`
- `packages/vite-plugin/src/index.ts`
- Existing `packages/nub/src/connect/*.test.ts` coverage

</canonical_refs>

<code_context>
## Existing Code Insights

- Scanner reports long functions in `normalizeConnectOrigin`, Vite plugin schema `walk`, and Vite plugin `nip5aManifest`.
- Scanner no longer reports `packages/shim/src/nipdb-shim.ts` after comment deletion reduced function length.
- Scanner reports four oversized files: `packages/core/src/types.ts`, `packages/nub/src/identity/types.ts`, `packages/sdk/src/index.ts`, and `packages/vite-plugin/src/index.ts`.

</code_context>

<specifics>
## Specific Ideas

- Extract scheme/path/host validation helpers in the connect origin normalizer.
- Extract Vite schema child walking into helper functions.
- Extract Vite plugin `configResolved`, `transformIndexHtml`, and `closeBundle` bodies into local helper functions.
- Re-run scanner and document any remaining file-size warnings with precise reasons.

</specifics>

<deferred>
## Deferred Ideas

- Public API type repartitioning belongs in a compatibility-focused structural milestone if it requires new module boundaries.

</deferred>

---

*Phase: 146-complexity-hotspot-split*
*Context gathered: 2026-05-24*
