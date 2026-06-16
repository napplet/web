# Milestone v0.32.0 — Napplet Conformance — Requirements

**Goal:** Let any napplet self-verify protocol conformance locally, before publishing,
via one browser-safe engine consumed by a headless CI CLI and a standalone
single-window web runtime.

**Approved design:** `docs/superpowers/specs/2026-06-16-napplet-conformance-design.md`

REQ-IDs continue the project's category-numbered convention. Phases (created by the
roadmap) map each requirement to exactly one phase. Phase groups mirror the design's
four areas: **M1 Engine → M2 CLI+CI → M3 Web runtime → M4 Boilerplate+Release.**

## v1 Requirements

### Engine — `@napplet/conformance` (M1)

- [ ] **ENGINE-01**: `@napplet/conformance` package exists — ESM-only, zero runtime deps beyond `@napplet/core`/`@napplet/nap` type imports, tsup build + `type-check` + vitest scripts, `package.json` + `jsr.json` wired to workspace publish conventions.
- [ ] **ENGINE-02**: A reference mock shell (`createReferenceShell`) attaches to a napplet iframe over `postMessage`, answers `shell.supports()`, responds to each NAP domain with spec-valid canned responses, and records every inbound envelope with a timestamp and validation verdict.
- [ ] **ENGINE-03**: A hand-written runtime envelope validator exists for every one of the 16 NAP domains; `validateEnvelope(msg)` returns a structured verdict (`ok` or `errors[]`) for any `domain.action` envelope.
- [ ] **ENGINE-04**: A drift test asserts every `NapDomain` and every exported `*Message` type in `@napplet/nap` has validator coverage, failing when a NAP message type is added without one.
- [ ] **ENGINE-05**: A manifest/meta validator (`validateManifest`) checks `napplet-type`, `aggregateHash`, config schema (JSON-Schema draft-07 core subset), connect origins (via `normalizeConnectOrigin`), and no-inline-`<script>`-without-`src` from a napplet's HTML/meta.
- [ ] **ENGINE-06**: A check registry implements the v1 zero-config catalog (manifest, boot, wire, degradation, lifecycle); each check exposes `{ id, area, severity, title, run(ctx) }` and returns pass/fail/skip with diagnostics.
- [ ] **ENGINE-07**: A serializable `ConformanceRun` result model plus `toPretty`, `toJson`, and `toJUnit` reporters render any run.
- [ ] **ENGINE-08**: `runConformance(ctx)` orchestrates the full suite against a booted iframe + reference shell and returns a `ConformanceRun`.
- [ ] **ENGINE-09**: happy-dom unit tests cover validators, reference-shell recording, the check registry, and reporters using in-package fixtures; `pnpm -r test:unit` stays green.

### Headless CLI + CI (M2)

- [ ] **CLI-01**: A `napplet-conformance` bin runs the engine against a napplet directory (prebuilt `dist/` or built on demand) or a URL.
- [ ] **CLI-02**: The CLI launches headless Chromium via Playwright, serves the napplet + a host harness page on loopback, runs the engine in-page, and extracts the `ConformanceRun`.
- [ ] **CLI-03**: The CLI supports `--reporter pretty|json|junit` and `--out <file>` and exits non-zero when any `error`-severity check fails.
- [ ] **CLI-04**: In-repo fixture napplets under `tests/fixtures/napplets/*` include at least one fully-conformant fixture exercising multiple NAPs and one deliberately non-conformant fixture.
- [ ] **CLI-05**: An e2e harness under `tests/e2e/harness` runs the CLI against both fixtures and asserts the expected pass/fail verdicts and process exit codes.
- [ ] **CLI-06**: A `conformance` CI workflow builds the fixtures and runs the CLI headless, caching the Playwright browser binary.

### Standalone Web Runtime — `apps/conformance` (M3)

- [ ] **WEB-01**: An `apps/conformance` single-window app accepts a napplet URL (querystring or field) or a local build and runs the engine live in-browser.
- [ ] **WEB-02**: The app renders a per-check pass/fail tree, the recorded envelope log with validation verdicts, and a manifest inspector.
- [ ] **WEB-03**: The app reuses `@napplet/conformance` directly with no logic duplication, builds and type-checks within the monorepo, and has deploy wiring.

### Boilerplate Integration + Release (M4)

- [ ] **REL-01**: A `test:conformance` invocation is documented and dogfooded against the in-repo fixture, and works package-manager-agnostically (pnpm/npm/yarn/bun).
- [ ] **REL-02**: The boilerplate-template change (separate `github.com/napplet/boilerplate` repo) is authored as a documented diff in the PR body (script + minimal config + CI step).
- [ ] **REL-03**: Docs are updated — root `README.md`, the new package README(s), and relevant `skills/` — for the conformance capability.
- [ ] **REL-04**: Changesets are authored for every package whose shipped output changes; `jsr.json` exports/versions are synced; NPM + JSR release steps are documented in the PR.
- [ ] **REL-05**: A final cross-path gate is green — engine unit tests, CLI headless run, web-runtime build, fixtures passing/failing as designed — alongside `pnpm build`, `pnpm type-check`, `pnpm -r test:unit`, and the AI-slop gate.

## Future Requirements (deferred)

- Scriptable per-NAP behavioral scenarios (drive relay subscribe→event→eose, storage round-trips, etc.).
- Author-scenario authoring API so napplets can add their own conformance scenarios.
- Conformance suite for **shells** (host side), not just napplets.
- Multi-browser matrix (Firefox/WebKit) for the headless runner.
- JSON-Schema/zod schema-generation refactor making one canonical envelope source-of-truth.

## Out of Scope

- Testing host shells — this milestone conformance-tests napplets, not shells.
- Refactoring the 16 NAP type files into a generated schema source-of-truth — hand-written validators kept in sync by tests instead.
- Folding the web runtime into `apps/web` — kept as a separate `apps/conformance` app.
- Publishing from local machines — release runs from GitHub Actions on merge to `main`.

## Traceability

_Filled by the roadmap: REQ-ID → Phase._
