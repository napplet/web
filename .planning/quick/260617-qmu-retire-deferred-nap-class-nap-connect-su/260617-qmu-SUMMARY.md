---
phase: quick
plan: 260617-qmu
subsystem: protocol-fidelity / NAP-SHELL
tags: [retire-on-defer, nap-class, nap-connect, agents-rule-8, breaking-change]
requires: []
provides:
  - "NAP-SHELL types with no residual class field"
  - "Reference shell that emits canonical class-free shell.init"
affects:
  - "@napplet/core (shell.init wire shape)"
  - "@napplet/shim (window.napplet.shell.class removed)"
  - "@napplet/nap (shellClass removed)"
  - "@napplet/conformance (reference shell class-free)"
tech-stack:
  added: []
  patterns: ["AGENTS.md rule 8 retire-on-defer applied to a re-homed deferred-NAP field"]
key-files:
  created:
    - .changeset/retire-nap-class-field.md
  modified:
    - packages/core/src/types/shell.ts
    - packages/core/src/types/global.ts
    - packages/core/src/index.test.ts
    - packages/core/README.md
    - packages/shim/src/index.ts
    - packages/shim/src/shell.test.ts
    - packages/shim/README.md
    - packages/nap/src/shell/sdk.ts
    - packages/nap/src/shell/index.ts
    - packages/nap/src/shell/shim.ts
    - packages/nap/src/shell/shim.test.ts
    - packages/conformance/src/shell/reference-shell.ts
    - packages/conformance/src/shell/reference-shell.test.ts
    - packages/conformance/src/validators/envelope.test.ts
    - README.md
    - skills/build-napplet/SKILL.md
  deleted:
    - specs/SHELL-CLASS-POLICY.md
    - specs/SHELL-CONNECT-POLICY.md
decisions:
  - "shell.init wire shape is now { capabilities, services } — the opaque NAP-CLASS class integer is fully retired (AGENTS.md rule 8)"
  - "conformance-cli got no changeset: it has no source dependency on the changed reference shell, so its built output is unaffected"
metrics:
  duration: ~40m
  completed: 2026-06-17
---

# Quick 260617-qmu: Retire deferred NAP-CLASS / NAP-CONNECT surface — Summary

Removed the deferred NAP-CLASS / NAP-CONNECT surface a prior sweep left behind, in two
layers: (A) docs/specs describing both NAPs as live protocol, and (B) the residual opaque
`class` integer that survived the original NAP-CLASS defer by being re-homed into
NAP-SHELL's `shell.init` environment. Per AGENTS.md rule 8 (retire-on-defer), a deferred
NAP's surface — including a field re-homed under another NAP — must not outlive the NAP.
The canonical NAP-SHELL spec carries no class field, so `shell.init` is now
`{ capabilities, services }`.

## What changed

### Docs / specs layer
- **Deleted** `specs/SHELL-CLASS-POLICY.md` and `specs/SHELL-CONNECT-POLICY.md` (kept the
  live `specs/SHELL-RESOURCE-POLICY.md`).
- **Root README.md**: `@napplet/nap` row now lists the real 16 subpath exports derived from
  `packages/nap/package.json` (relay, storage, inc, ifc, keys, shell, theme, media, notify,
  identity, config, resource, cvm, outbox, upload, intent) — dropped the invented
  connect/class and added the missing ifc/shell; `@napplet/vite-plugin` row replaced the
  fictional `connect?: string[]` / `strictCsp` / "sole runtime CSP authority" description
  with the real options (nappletType, requires, artifactMode, configSchema, archetypes);
  removed the "v0.29.0 — NAP-CONNECT + Shell as CSP Authority" changelog bullet and the two
  garbled `class.assigned` / `window.napplet.connect|class` diagram rows.
- **skills/build-napplet/SKILL.md**: dropped the NAP-CLASS/NAP-CONNECT frontmatter clause
  (kept NAP-IDENTITY), removed the entire "Step 11 — Two-class posture …" section,
  renumbered Step 12→11 and Step 13→12, and removed the two NAP-CLASS/NAP-CONNECT gotcha
  bullets. Kept Step 10 (NAP-RESOURCE) and the live iframe-sandbox `connect-src 'none'`
  gotcha, which describe the sandbox, not NAP-CONNECT.

### Code layer — the residual NAP-SHELL `class` field
- **@napplet/core**: removed `class` from `ShellEnvironment`, `NappletShell`, and
  `ShellInitMessage` (field + JSDoc + `class: 1` examples), fixed the top-of-file handshake
  prose, dropped the "opaque `class`" phrase from `global.ts`, and cleaned `index.test.ts`
  and `README.md`.
- **@napplet/shim**: stopped reading/writing `class` in `handleShellInit` and the default
  env; cleaned `shell.test.ts` and `README.md` (removed `window.napplet.shell.class` and
  `shellClass` from the helper list).
- **@napplet/nap/shell**: removed the `shellClass()` helper + JSDoc from `sdk.ts`, dropped
  it from the `index.ts` barrel, and made `createShellEnvironment` (`shim.ts`) no longer
  read/write `class`; cleaned `shim.test.ts` (kept the malformed-field coercion case for
  capabilities/protocols/services, removed only its class parts).
- **@napplet/conformance**: removed the `class` option, `ReferenceShell.class`, the `klass`
  local, and both `class` keys in the emitted `shell.init` so the reference shell emits
  `{ type, capabilities, services }`; cleaned `reference-shell.test.ts` and the inert
  `class: null` fixture key in `envelope.test.ts`.

### Changeset
- Added `.changeset/retire-nap-class-field.md` — `minor` bumps for @napplet/core,
  @napplet/shim, @napplet/nap, @napplet/conformance (0.x breaking wire change), documenting
  the BREAKING CHANGE. `pnpm version-packages` intentionally NOT run (CI-driven).

## Verification

Gates run from repo root, all green:

- `pnpm build` → **11 tasks successful** (11.1s).
- `pnpm type-check` → **15 tasks successful**, svelte-check 0 errors / 0 warnings (3.5s).
- `pnpm -r test:unit` → all green:
  - core: 23 passed (2 files)
  - nap: 64 passed (12 files)
  - shim: 11 passed (2 files)
  - vite-plugin: 9 passed (1 file)
  - conformance: 62 passed (8 files)
  - conformance-cli: 11 passed (3 files)

Repo-wide grep gate (excluding node_modules, dist, .git, CHANGELOG, AGENTS/CLAUDE.md,
.planning, and the vite-plugin CVE "class / ReDoS" comment) returns **zero live hits** for
NAP-CLASS / NAP-CONNECT / class.assigned / nap:class / nap:connect /
window.napplet.(class|connect) / shellClass / connect:scheme. The only matches are in the
new `.changeset/` file, which *describes* the retirement (a changelog-style record of the
breaking change, not live protocol surface). The class field is gone from all source types
(`grep "class: number | null"` → none). `dist/` is git-ignored; no build artifacts were
committed.

## Deviations from Plan

None for Rules 1–4. Two clarifications applied within plan scope:
- The plan's fidelity line numbers were approximate (the prior sweep garbled tokens); all
  edits were matched on actual current file content as instructed.
- Cleaned a few extra `class` references in `packages/core/README.md` and
  `packages/shim/README.md` (type-summary tables, prose) beyond the exact lines cited, to
  satisfy Task 9's broad grep gate. Still within Task 4/5 scope (those READMEs are listed
  files).

## Protocol-fidelity flags

- **Confirmed clean:** the conformance envelope validator under test asserts only on
  `domain` / `direction` / `errors` for `shell.init` — it never asserted on a `class` field,
  so no residual *validator* surface needed removal (only an inert fixture key).
- No new invented surface introduced. This is a pure retire-on-defer that *removes* deferred
  surface to restore conformance with canonical NAP-SHELL — conformance restoration, not a
  new field.

## Commits (in order)

| Task | Commit  | Message |
| ---- | ------- | ------- |
| 1 | bfaaaf8 | docs(specs): retire deferred NAP-CLASS/NAP-CONNECT shell-policy docs |
| 2 | 82c7dcb | docs(readme): drop deferred NAP-CLASS/NAP-CONNECT from table, changelog, diagram |
| 3 | c019a5b | docs(skill): remove deferred NAP-CLASS/NAP-CONNECT step and references |
| 4 | d124eaf | refactor(core)!: remove residual NAP-CLASS class field from NAP-SHELL env |
| 5 | a86dfd0 | refactor(shim)!: drop residual NAP-CLASS class field |
| 6 | 9547d4f | refactor(nap)!: remove shellClass / residual NAP-CLASS field from nap/shell |
| 7 | f3e0fbe | refactor(conformance)!: reference shell emits class-free shell.init |
| 8 | 9ffa822 | chore(changeset): retire NAP-CLASS class field |

## Self-Check: PASSED

- specs/SHELL-CLASS-POLICY.md and specs/SHELL-CONNECT-POLICY.md: confirmed deleted.
- .changeset/retire-nap-class-field.md: confirmed present.
- All 8 task commits present in `git log`.
- build / type-check / `-r test:unit` all green; no dist/ committed.
