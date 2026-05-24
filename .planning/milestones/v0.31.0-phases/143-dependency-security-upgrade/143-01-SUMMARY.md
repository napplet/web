---
phase: 143-dependency-security-upgrade
plan: 01
subsystem: dependencies
tags: [security, pnpm, vite, postcss, turbo]

requires:
  - SEC-01
  - SEC-02
  - SEC-03
  - SEC-04
provides:
  - vite resolves to 6.4.2
  - postcss resolves to 8.5.10 through a pnpm override
  - turbo resolves to 2.9.14
  - security scanner has zero vulnerable-dependency findings
affects: []

tech-stack:
  added: []
  patterns:
    - pnpm override for transitive security patching

key-files:
  created:
    - .planning/phases/143-dependency-security-upgrade/143-CONTEXT.md
    - .planning/phases/143-dependency-security-upgrade/143-01-PLAN.md
    - .planning/phases/143-dependency-security-upgrade/143-01-SUMMARY.md
    - .planning/phases/143-dependency-security-upgrade/143-VERIFICATION.md
  modified:
    - package.json
    - packages/vite-plugin/package.json
    - pnpm-lock.yaml
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/STATE.md

key-decisions:
  - "Kept Vite on major 6 by using ^6.4.2 instead of taking the latest major."
  - "Added a root pnpm override for postcss 8.5.10 because Vite 6.4.2 still resolved postcss 8.5.8."

patterns-established:
  - "Use pnpm overrides for patched transitive tooling dependencies when the direct package's compatible minor does not lift the vulnerable transitive version."

requirements-completed: [SEC-01, SEC-02, SEC-03, SEC-04]

duration: 10min
completed: 2026-05-24
---

# Plan 143-01: Upgrade Vulnerable Tooling Dependencies Summary

**Upgraded the vulnerable tooling dependency graph while preserving the Vite 6 compatibility path.**

## Accomplishments

- Raised root `vite` from `^6.3.0` to `^6.4.2`.
- Raised `@napplet/vite-plugin` dev `vite` from `^6.3.0` to `^6.4.2`.
- Raised root `turbo` from `^2.5.0` to `^2.9.14`.
- Added a root `pnpm.overrides.postcss = 8.5.10` entry because Vite 6.4.2 still resolved `postcss 8.5.8`.
- Refreshed `pnpm-lock.yaml` and local `node_modules`.

## Evidence

- `pnpm why vite` shows `vite 6.4.2`.
- `pnpm why postcss` shows `postcss 8.5.10`.
- `pnpm why turbo` shows `turbo 2.9.14`.
- `pnpm dlx aislop scan --json . > /tmp/napplet-143-aislop.json` exits non-zero because later-phase warnings remain, but JSON reports `security.issues = 0` and no `security/vulnerable-dependency` diagnostics.
- `pnpm -r type-check` exits 0.
- `pnpm -r build` exits 0.
- `pnpm -r test:unit` exits 0.

## Deviations from Plan

- Added the anticipated `postcss` override after graph verification showed Vite 6.4.2 still depended on `postcss 8.5.8`.

## Next Phase Readiness

- Phase 144 can start. Security dependency findings are closed; non-security scanner warnings remain in scope for Phases 144-147.

---

*Phase: 143-dependency-security-upgrade*
*Completed: 2026-05-24*
