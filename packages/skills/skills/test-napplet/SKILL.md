---
name: test-napplet
description: Use to verify a napplet before publishing - run protocol conformance with the @napplet/conformance-cli runner (real Chromium, reference shell), interpret failures, confirm OUTBOX-first boundaries, the single-file artifact, runtime guard, and CI wiring. Run after build-napplet, before shipping.
---

# Testing a Napplet

Conformance proves the build speaks NIP-5D correctly inside a real `sandbox="allow-scripts"` iframe driven by a reference shell — catching malformed envelopes, manifest problems, boot failures, and forbidden-global references locally instead of after publishing. Truth: NIP-5D (<https://github.com/nostr-protocol/nips/pull/2303>) + NAPs (<https://github.com/napplet/naps>).

## Step 1 — Build first

```bash
pnpm build
```

Conformance runs against built output (`./dist`, preferring `dist/index.html`, falling back to `./index.html`). Always test the build, not source.

## Step 2 — Run conformance

`napplet-conformance` (from `@napplet/conformance-cli`) loads the build into headless Chromium, drives the protocol with a reference shell, runs the check catalog, and sets the exit code.

```jsonc
// package.json
{ "scripts": { "test:conformance": "napplet-conformance ./dist" } }
```

```bash
pnpm test:conformance          # exits non-zero on any error-severity failure
# package-manager agnostic:
npx napplet-conformance ./dist
```

Exit codes: `0` conformant, `1` non-conformant, `2` usage/runtime error.

For a visual, live report (like `vitest --ui`):

```bash
napplet-conformance --ui ./dist
```

## Step 3 — Interpret failures

Failures map to a NIP-5D / NAP requirement — fix the napplet, not the check. Common classes:

- **Boot failure** — the runtime did not inject `window.napplet` before app code ran, or a top-level throw blocked boot.
- **Malformed envelope** — a message that isn't a valid `{ type: "domain.action", … }` for its NAP. Re-check arguments to the `window.napplet.*` call.
- **Manifest problem** — missing/invalid `napplet-type` meta or manifest tags. Confirm the vite-plugin ran and `nappletType` is set.
- **Forbidden global** — the bundle references `fetch`, `localStorage`, `window.nostr`, `XMLHttpRequest`, `WebSocket`, etc. Replace with `resource.bytes` / `storage` / `relay`. (Static scan — even unreachable references flag.)

A check that fails a spec-faithful napplet but passes only this toolchain is a tooling bug — flag it; do not work around it.

## Step 4 — Boundary Audit

Before publishing, inspect source and built output for wrong-layer code:

| Check | Expected |
| --- | --- |
| Normal social reads/publishes | `outbox`, `common`, `lists`, `count`, or `dm`, not default `relay` |
| Any `relay.subscribe` / `relay.publish` use | A comment or spec note naming the relay-local escape hatch |
| Signing/encryption | No `window.nostr`, private keys, local signing, or app-owned encryption |
| Relay routing | No app-owned NIP-65 resolver, relay pool, WebSocket relay client, or relay fanout policy |
| Network and media bytes | No direct `fetch`, `XMLHttpRequest`, `WebSocket`, or external `<img src>`; use `resource` |
| Persistence | No `localStorage`, `IndexedDB`, cookies, or direct filesystem state; use `storage` |
| Capability checks | Domain property presence (`window.napplet?.outbox`), never `shell.supports` |

If a direct relay use remains, prove why `outbox`, `common`, `lists`, `count`, and `dm` do not fit. Otherwise refactor before shipping.

## Step 5 — Confirm the artifact & guard

- **Single file:** the published napplet is one `index.html` with inline JS (opaque-origin `srcdoc`, no external `<script src>`). Use `artifactMode: 'single-file'`. Verify `dist/index.html` is self-contained.
- **Runtime guard:** opened without a runtime it shows an explanatory modal rather than failing silently. For standalone manual testing, opt out before the shim loads via `window.__NAPPLET_ALLOW_STANDALONE__ = true` or `<meta name="napplet-allow-standalone">`.

## Step 6 — Scenario Smoke Tests

Exercise the feature against the NAP domains it declares:

- Signed-out path: identity returns `""`; app degrades without publish/list/dm actions.
- OUTBOX path: `outbox.query`, `outbox.subscribe`, and `outbox.publish` use current option fields only (`authors`, `author`, `relays`, `targetAuthors`, `limit`, `timeoutMs`). No `strategy`, subscribe `live`, or `outbox.eose`.
- Optional-domain path: remove an optional domain from the mock runtime and verify fallback UI.
- Escape hatch path: if `relay` is used, test the explicit relay-local behavior and teardown.

## Step 7 — CI

Run conformance headless in CI: cache Playwright's Chromium, build, then run the CLI. See `.github/workflows/conformance.yml` in the napplet monorepo for the reference pattern.

```yaml
- run: pnpm build
- run: npx napplet-conformance ./dist   # non-zero exit fails the job
```

Green conformance + a self-contained single-file build = ready to publish.

## Step 8 - Benchmark tooling changes

When the task changes the napplet boilerplate, creation workflow, or these
skills, also run the napplet production benchmark from the monorepo:

```bash
pnpm benchmark:creation
```

The default run scores `benchmarks/prompts/outbox-latest-note.md` against the
committed candidate fixture. Override the candidate and condition for real
one-shot agent outputs:

```bash
pnpm benchmark:creation -- \
  --prompt benchmarks/prompts/outbox-latest-note.md \
  --candidate /path/to/agent-output \
  --agent codex \
  --condition skills \
  --out benchmark.json \
  --markdown benchmark.md
```

The report captures:

| Metric | Evidence |
| --- | --- |
| Development speed | `--started-at` wall time or elapsed scoring seconds |
| Workflow | frozen prompt hash, declared condition, and supplied candidate |
| Accuracy | scenario behavior and protocol-boundary checks on the produced napplet |
| Completeness | project files, build/verify/conformance scripts, verification guidance |
| Bugs | count of failed benchmark checks |

For improvement work, keep one report for each compared condition. Use the same
prompt file for each one-shot agent run and score the candidate it actually
produced.
