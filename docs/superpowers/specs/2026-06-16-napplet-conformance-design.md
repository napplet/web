# Napplet Conformance Testing — Design

**Date:** 2026-06-16
**Status:** Approved (scope forks confirmed by user)
**Author:** conformance milestone cycle

## Problem

A napplet is a static Vite-built web app loaded into a `sandbox="allow-scripts"`
(no `allow-same-origin`) iframe. It installs `window.napplet` via `@napplet/shim`
and communicates with a host **shell** purely through `postMessage` JSON envelopes
`{ type: "domain.action", ...payload }` across 16 NAP domains, plus a build-time
NIP-5A manifest (meta tags, `napplet-type`/d-tag, `aggregateHash`, config schema,
connect origins, no inline scripts).

Today a napplet author **cannot know their app conforms** to the protocol without
publishing it and loading it inside a real shell. The NAP message types are
**TypeScript-only** — there are no runtime envelope validators. This makes the
feedback loop "publish → load in a runtime → discover it's broken," which is far
too slow.

## Goal

Let any napplet (especially boilerplate-derived ones) answer "does this work?"
locally, in two scopes that share one engine:

1. **Headless / CI** — `test:conformance` runs in Playwright-driven Chromium,
   prints a report, sets an exit code.
2. **Standalone web runtime** — a single-window app that loads a napplet and runs
   the same suite with a visual report.

## Confirmed scope decisions

1. **v1 depth = protocol conformance, zero-config.** No author setup. v1 does NOT
   include scriptable per-NAP behavioral scenarios or an author-scenario API
   (deferred to a later milestone).
2. **Standalone runtime = new `apps/conformance` app**, deployed separately, reusing
   the engine. Not folded into `apps/web`.
3. **Envelope validators = hand-written per-NAP validators inside
   `@napplet/conformance`** (zero new deps, full control), kept in sync with the TS
   types by tests. Not a schema-generation refactor; not co-located in `@napplet/nap`.

## Architecture

Both target environments are browsers (Playwright Chromium for CI; the standalone
app's own window). So the engine is browser-safe code, and the CLI is a thin
Playwright driver around it.

```
                ┌─────────────────────────────────────────────┐
                │            @napplet/conformance               │
                │  (framework-agnostic, browser-safe engine)    │
                │                                               │
                │  • Reference mock shell (scriptable responder │
                │    + envelope recorder over postMessage)      │
                │  • Per-NAP runtime envelope validators        │
                │  • Manifest / meta-tag validator              │
                │  • Check registry (id, area, severity, run()) │
                │  • Runner: (iframe, manifest) → ConformanceRun │
                │  • Serializable result model + reporters       │
                └───────────────┬───────────────┬───────────────┘
                                │               │
              ┌─────────────────▼──┐      ┌─────▼──────────────────┐
              │ @napplet/conformance│      │   apps/conformance      │
              │  CLI (bin)          │      │  single-window web app  │
              │  • Playwright driver│      │  • point at napplet URL │
              │  • serves napplet   │      │  • runs engine live     │
              │    dist + host page │      │  • visual report +      │
              │  • reporters:       │      │    envelope log +       │
              │    pretty/JSON/JUnit│      │    manifest inspector   │
              │  • exit code        │      └─────────────────────────┘
              └─────────────────────┘
```

### `@napplet/conformance` (new package)

Framework-agnostic, browser-safe. No DOM-launch logic (that's the CLI's job).
Exports:

- **`createReferenceShell(opts)`** — given a target `Window` (the napplet iframe's
  `contentWindow`) and a `MessagePort`/`postMessage` channel, implements a minimal
  conformant shell: answers `shell.supports()`, responds to each NAP domain with
  spec-valid canned responses, and **records every inbound envelope** with a
  timestamp and validation verdict. Responders are data-driven and overridable so
  later milestones can script behavior.
- **Per-NAP validators** — `validateEnvelope(msg): EnvelopeVerdict`. One small
  validator per domain asserting `type` shape, required fields, and value
  constraints (e.g. `relay.subscribe` requires `id`, `subId`, `filters[]`). A
  drift test in `@napplet/conformance` asserts every `NapDomain` and every exported
  `*Message` type in `@napplet/nap` has a validator.
- **`validateManifest(doc): ManifestVerdict`** — parses the napplet's `index.html`
  meta tags / NIP-5A manifest: valid `napplet-type`, `aggregateHash` present and
  well-formed, config schema is JSON-Schema-draft-07 core subset, connect origins
  pass `normalizeConnectOrigin`, no inline `<script>` without `src`.
- **Check registry** — each check is `{ id, area, severity, title, run(ctx) }`
  returning pass/fail/skip + diagnostics. v1 catalog below.
- **`runConformance(ctx): Promise<ConformanceRun>`** — orchestrates the suite
  against a booted iframe + reference shell, returns a serializable result tree.
- **Reporters** — `toPretty`, `toJson`, `toJUnit` over `ConformanceRun`.

### v1 check catalog (zero-config protocol conformance)

| Area | Check | What it proves |
|------|-------|----------------|
| Manifest | `manifest/napplet-type` | d-tag/type meta present & valid |
| Manifest | `manifest/aggregate-hash` | aggregateHash meta present & well-formed |
| Manifest | `manifest/config-schema` | config schema is draft-07 core subset (if present) |
| Manifest | `manifest/connect-origins` | every connect origin passes `normalizeConnectOrigin` (if present) |
| Manifest | `manifest/no-inline-scripts` | no `<script>` without non-empty `src` |
| Boot | `boot/sandbox-allow-scripts` | loads & runs under `allow-scripts` only (no `allow-same-origin`) |
| Boot | `boot/installs-global` | `window.napplet` present after load |
| Boot | `boot/no-forbidden-globals` | no `window.nostr` access attempt |
| Wire | `wire/envelope-well-formed` | EVERY emitted envelope validates against its NAP validator |
| Wire | `wire/declared-naps-only` | napplet only emits domains it declared / gated behind `supports()` |
| Degradation | `degrade/supports-false` | with `shell.supports()=false`, napplet does not hang/throw uncaught |
| Lifecycle | `lifecycle/clean-teardown` | subscriptions/listeners close on unload (best-effort) |

Checks are **observational** where possible (the napplet drives itself; the shell
records and validates), not behavioral scripting. A napplet that never touches a NAP
simply skips that NAP's wire checks — and that's a valid pass.

### `@napplet/conformance` CLI (bin in the same package)

`napplet-conformance [path-or-url] [--reporter pretty|json|junit] [--out file]`.
- If given a directory, builds (or expects a prebuilt `dist/`) and serves it on a
  loopback static server; if given a URL, uses it directly.
- Launches headless Chromium (Playwright, already a devDependency) with the Wayland
  flag pattern established in prior milestones, loads a host harness page that
  embeds the napplet iframe + reference shell, runs the engine **in-page**, extracts
  the `ConformanceRun` JSON, prints the chosen reporter, exits non-zero on any
  `severity: error` failure.
- This is what `test:conformance` invokes.

### `apps/conformance` (new web app)

Small single-window app (vanilla or minimal Svelte to match `apps/web`). Input: a
napplet URL (querystring or field) or a locally-served build. Embeds the napplet +
reference shell, runs the engine live, renders: per-check pass/fail tree, the
recorded envelope log with validation verdicts, and a manifest inspector. Reuses
`@napplet/conformance` directly. Own deploy target.

## Boilerplate integration

The boilerplate template lives in the **separate** `github.com/napplet/boilerplate`
repo. In-repo we:
- add a reference fixture napplet under `tests/fixtures/napplets/*` (already globbed)
  that exercises several NAPs, to dogfood and e2e the harness;
- add a deliberately-broken fixture to prove the harness FAILS correctly.

The boilerplate template change (a `"test:conformance": "napplet-conformance ."`
script + a one-line config + a CI step) is prepared as a documented change set in
the PR body for the maintainer to apply to the template repo, since it is a
different repo. Works across pnpm/npm/yarn/bun because the bin is package-manager
agnostic.

## CI

A new `conformance.yml` workflow (or a job appended to `ci.yml`) that builds the
fixture napplet(s) and runs `pnpm test:conformance` headless. Efficient: reuse the
existing Playwright dev dependency, cache the browser binary, run only on changes to
conformance packages + fixtures via path filters where sensible.

## Milestone decomposition (multi-milestone, GSD-driven)

- **M1 — Conformance Engine Foundations.** `@napplet/conformance`: result model,
  reference mock shell, per-NAP + manifest validators, check registry with the v1
  catalog, drift tests, unit tests under happy-dom with fixtures. No browser launch.
- **M2 — Headless CLI + CI.** Playwright runner + reporters + exit codes; in-repo
  fixture napplets (`tests/fixtures/napplets/*`) including a broken one; `tests/e2e/harness`
  e2e of the CLI; `conformance.yml` CI workflow.
- **M3 — Standalone Web Runtime.** `apps/conformance` consuming the engine; visual
  report; deploy wiring.
- **M4 — Boilerplate Integration + Release.** `test:conformance` wiring + docs;
  prepared boilerplate-template change; changesets; npm + JSR release prep; final
  e2e across all paths; PR.

GSD may refine the exact phase counts inside each milestone.

## Non-goals (v1)

- Scriptable per-NAP behavioral scenarios and an author-scenario authoring API.
- Conformance for **shells** (this tests napplets, not host shells).
- Schema-generation refactor of the NAP type files.
- Multi-browser matrix (Chromium only for v1).

## Risks & mitigations

- **Validator drift vs TS types** → drift test asserting validator coverage of every
  domain + exported message type; CI gate.
- **Sandbox fidelity** (Playwright iframe vs real shell) → use the exact
  `sandbox="allow-scripts"` attribute and `postMessage` source-identity checks the
  shim relies on; assert no `allow-same-origin`.
- **Boilerplate is a separate repo** → in-repo fixtures dogfood the harness; template
  change delivered as a documented diff in the PR.
- **JSR slow-types / ESM-only** → engine stays zero-dep and ESM-only; CLI keeps
  Playwright as the only heavy dep and may be marked appropriately for JSR.
```
