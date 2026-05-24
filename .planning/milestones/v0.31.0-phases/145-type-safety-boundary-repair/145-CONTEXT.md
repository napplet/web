# Phase 145: Type Safety Boundary Repair - Context

**Gathered:** 2026-05-24
**Status:** Ready for execution

<domain>
## Phase Boundary

Replace production `as any` and `as unknown as` patterns reported by the scanner with narrower local types, discriminated branches, or typed integration-boundary adapters. Preserve current message handling behavior.

</domain>

<decisions>
## Implementation Decisions

- **D-01:** Keep handler behavior unchanged; this phase repairs typing at existing boundaries rather than redesigning message protocols.
- **D-02:** Prefer discriminated `msg.type` branches and direct typed calls over broad double assertions.
- **D-03:** Replace `window as any` mount points with explicit structural window interfaces.
- **D-04:** Add a focused smoke test for touched exported handlers and mount cleanup behavior.

### Agent's Discretion

- Whether a direct assertion is acceptable when the preceding discriminator branch has already selected the wire type
- Test file placement inside existing package test globs

</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` — TYPE-01..04
- `/tmp/napplet-144-aislop.json` — post-Phase-144 scanner baseline
- `packages/nub/src/*/shim.ts`
- `packages/nub/src/class/index.ts`
- `packages/shim/src/index.ts`
- `packages/shim/src/nipdb-shim.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

- Scanner reports 24 double assertions and 8 `as any` assertions in production.
- Existing class/connect shim tests already cover invalid messages and mount cleanup for those domains.
- Other exported handler functions can receive invalid-domain messages without requiring a browser parent shell.
- `packages/shim/src/index.ts` and `packages/shim/src/nipdb-shim.ts` need structural window types for global mounts.

</code_context>

<specifics>
## Specific Ideas

- Convert `msg as unknown as X` to branch-local typed calls or direct assertions after type discrimination.
- Replace `window as any` with `Window & { napplet?: ... }` and `Window & { nostrdb?: ... }` shapes.
- Use a new `boundary-smoke.test.ts` for no-throw invalid handler dispatch and mount cleanup where practical.
- Re-run scanner, type-check, build, and unit tests.

</specifics>

<deferred>
## Deferred Ideas

- Long-function and file-size warnings remain Phase 146.

</deferred>

---

*Phase: 145-type-safety-boundary-repair*
*Context gathered: 2026-05-24*
