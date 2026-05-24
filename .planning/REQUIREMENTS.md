# Requirements: Napplet Protocol SDK v0.31.0 Cleanup Quality Gate

**Defined:** 2026-05-24
**Core Value:** Prove that sandboxed Nostr apps can securely delegate to a host shell over a simple, standardized protocol — and ship the spec + SDK so others can build on it.

## v1 Requirements

Requirements for v0.31.0. Each maps to roadmap phases after roadmapping.

### Security and Dependencies

- [x] **SEC-01**: Maintainer can upgrade the root dependency graph so `vite` resolves to `6.4.2` or later without forcing a major Vite migration unless implementation evidence proves it is required.
- [x] **SEC-02**: Maintainer can upgrade the dependency graph so `postcss` resolves to `8.5.10` or later and `turbo` resolves to `2.9.14` or later.
- [x] **SEC-03**: Maintainer can run the security quality gate and see no remaining vulnerable-dependency findings for `vite`, `postcss`, or `turbo`.
- [x] **SEC-04**: Maintainer can run the workspace build, type-check, and unit-test commands after dependency upgrades with no regressions.

### Lint and Fixable Cleanup

- [x] **LINT-01**: Maintainer can verify duplicate `@napplet/core` imports are merged in `packages/nub/src/relay/types.ts` and `packages/shim/src/index.ts`.
- [x] **LINT-02**: Maintainer can verify unused type imports are removed from `packages/nub/src/storage/shim.ts`, `packages/nub/src/identity/shim.ts`, and `packages/nub/src/keys/shim.ts`.
- [x] **LINT-03**: Maintainer can verify production source no longer contains leftover `console.log`, `console.debug`, or `console.info` calls reported by the quality gate.
- [x] **LINT-04**: Maintainer can verify the duplicated block in `packages/shim/src/index.ts` is collapsed into a single local helper or deleted path without changing global shim installation behavior.

### Comment and AI-Slop Hygiene

- [x] **SLOP-01**: Maintainer can verify decorative section separators and narrative comment blocks reported by the quality gate are removed from source files while preserving useful public API documentation.
- [x] **SLOP-02**: Maintainer can verify trivial comments that restate obvious assignments or calls are removed from NUB shim source.
- [x] **SLOP-03**: Maintainer can verify the scanner's fixable AI-slop categories from the v0.31.0 kickoff report are either zeroed or reduced to explicitly reviewed false positives.

### Type Safety

- [x] **TYPE-01**: Maintainer can verify production `as any` assertions around `window.napplet` and global mounts are replaced with typed local helpers or more specific structural types.
- [x] **TYPE-02**: Maintainer can verify double assertions in production message handlers are replaced with discriminated-union narrowing, typed dispatcher boundaries, or small runtime guards.
- [x] **TYPE-03**: Maintainer can verify any remaining unavoidable assertions are isolated at an integration boundary and covered by tests or an explicit verification note.
- [x] **TYPE-04**: Maintainer can run invalid-message or mount-behavior tests for every shim touched during type-safety cleanup.

### Complexity and Structure

- [x] **QUAL-01**: Maintainer can verify `normalizeConnectOrigin` is split into focused helpers while preserving the 28-case normalizer smoke coverage and canonical aggregate-hash fixture behavior.
- [x] **QUAL-02**: Maintainer can verify long functions reported in `packages/shim/src/nipdb-shim.ts` and `packages/vite-plugin/src/index.ts` are split or narrowed without changing public behavior.
- [x] **QUAL-03**: Maintainer can verify oversized type/barrel files are reduced where low-risk module boundaries already exist, and any remaining file-size warnings have exact deferral notes.
- [x] **QUAL-04**: Maintainer can run the code-quality gate and see no unreviewed warnings from the kickoff report's function-length, duplicate-code, or file-size findings.

### Final Gate

- [ ] **GATE-01**: Maintainer can run the same quality scanner class used in the kickoff report and see zero security errors.
- [ ] **GATE-02**: Maintainer can run formatting, linting, code-quality, and AI-slop checks and see the kickoff findings closed or explicitly deferred with rationale.
- [ ] **GATE-03**: Maintainer can run `pnpm -r type-check`, `pnpm -r build`, and `pnpm -r test:unit` successfully after all cleanup edits.
- [ ] **GATE-04**: Maintainer can review a concise cleanup summary listing simplifications made, deleted code/comments, remaining risks, and exact verification evidence.

## v2 Requirements

Deferred to future release. Tracked but not in the current roadmap.

### Structural Cleanup

- **STRUCT-01**: Maintainer can repartition the largest public type surfaces into smaller authored modules if v0.31.0 finds that doing so requires public API compatibility planning.
- **STRUCT-02**: Maintainer can remove deprecated `@napplet/nub-<domain>` packages after the planned deprecation window, separate from this scanner cleanup.

## Out of Scope

| Feature | Reason |
|---------|--------|
| NUB protocol or wire-shape changes | This milestone is behavior-preserving cleanup. |
| New runtime dependencies | The kickoff scope is cleanup and security remediation; reuse existing helpers and toolchain. |
| npm, JSR, or GitHub Actions publication repair | Publish workflow blockers are separate operator/release work. |
| Deprecated NUB package removal | Already tracked as REMOVE-01..03 and not required to close the current scanner report. |
| Broad formatting churn outside scanner findings | Keep diffs reviewable and tied to the quality gate. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 143 | Complete |
| SEC-02 | Phase 143 | Complete |
| SEC-03 | Phase 143 | Complete |
| SEC-04 | Phase 143 | Complete |
| LINT-01 | Phase 144 | Complete |
| LINT-02 | Phase 144 | Complete |
| LINT-03 | Phase 144 | Complete |
| LINT-04 | Phase 144 | Complete |
| SLOP-01 | Phase 144 | Complete |
| SLOP-02 | Phase 144 | Complete |
| SLOP-03 | Phase 144 | Complete |
| TYPE-01 | Phase 145 | Complete |
| TYPE-02 | Phase 145 | Complete |
| TYPE-03 | Phase 145 | Complete |
| TYPE-04 | Phase 145 | Complete |
| QUAL-01 | Phase 146 | Complete |
| QUAL-02 | Phase 146 | Complete |
| QUAL-03 | Phase 146 | Complete |
| QUAL-04 | Phase 146 | Complete |
| GATE-01 | Phase 147 | Pending |
| GATE-02 | Phase 147 | Pending |
| GATE-03 | Phase 147 | Pending |
| GATE-04 | Phase 147 | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-05-24*
*Last updated: 2026-05-24 after Phase 146 verification*
