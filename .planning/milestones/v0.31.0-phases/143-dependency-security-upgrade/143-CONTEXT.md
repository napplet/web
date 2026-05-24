# Phase 143: Dependency Security Upgrade - Context

**Gathered:** 2026-05-24
**Status:** Ready for execution

<domain>
## Phase Boundary

Upgrade the dependency graph for the vulnerable tooling findings reported by `aislop 0.9.3`: `vite`, transitive `postcss`, and `turbo`. Preserve the current Vite 6 compatibility path unless verification proves a major migration is required.

</domain>

<decisions>
## Implementation Decisions

- **D-01:** Keep Vite on the current major by raising workspace Vite ranges to `^6.4.2`.
- **D-02:** Raise root `turbo` to `^2.9.14`.
- **D-03:** Prefer manifest and lockfile-only graph edits. Add an override only if `postcss` does not resolve to `8.5.10` or later through the updated graph.

### Agent's Discretion

- Exact lockfile update command
- Whether to add a package-manager override for transitive `postcss`
- Verification log locations under `/tmp`

</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` — SEC-01, SEC-02, SEC-03, SEC-04
- `package.json` — root Vite/Turbo dev dependency ranges
- `packages/vite-plugin/package.json` — package-local Vite dev dependency range
- `pnpm-lock.yaml` — resolved dependency graph

</canonical_refs>

<code_context>
## Existing Code Insights

- Root `package.json` currently declares `vite: ^6.3.0` and `turbo: ^2.5.0`.
- `packages/vite-plugin/package.json` currently declares `vite: ^6.3.0`.
- `pnpm outdated vite postcss turbo` showed `vite 6.4.1`, `turbo 2.8.21`, and newer patched versions available.
- Baseline `pnpm dlx aislop scan --json .` reports vulnerable dependency findings for `vite`, `postcss`, and `turbo`.
- Workspace verification commands are `pnpm -r type-check`, `pnpm -r build`, and `pnpm -r test:unit`.

</code_context>

<specifics>
## Specific Ideas

- Patch only package manifests first.
- Run `pnpm install --lockfile-only` to refresh `pnpm-lock.yaml`.
- Confirm resolved versions with `pnpm why vite`, `pnpm why postcss`, and `pnpm why turbo`.
- Re-run `pnpm dlx aislop scan --json .` and inspect only security diagnostics for this phase.

</specifics>

<deferred>
## Deferred Ideas

- Lint, AI-slop, type-safety, and complexity warnings are owned by Phases 144-147.

</deferred>

---

*Phase: 143-dependency-security-upgrade*
*Context gathered: 2026-05-24*
