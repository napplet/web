---
name: test-napplet
description: Use to verify a napplet before publishing — run protocol conformance with the @napplet/conformance-cli runner (real Chromium, reference shell), interpret failures, confirm the single-file artifact and runtime guard, and wire a CI check. Run after build-napplet, before shipping.
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

## Step 4 — Confirm the artifact & guard

- **Single file:** the published napplet is one `index.html` with inline JS (opaque-origin `srcdoc`, no external `<script src>`). Use `artifactMode: 'single-file'`. Verify `dist/index.html` is self-contained.
- **Runtime guard:** opened without a runtime it shows an explanatory modal rather than failing silently. For standalone manual testing, opt out before the shim loads via `window.__NAPPLET_ALLOW_STANDALONE__ = true` or `<meta name="napplet-allow-standalone">`.

## Step 5 — CI

Run conformance headless in CI: cache Playwright's Chromium, build, then run the CLI. See `.github/workflows/conformance.yml` in the napplet monorepo for the reference pattern.

```yaml
- run: pnpm build
- run: npx napplet-conformance ./dist   # non-zero exit fails the job
```

Green conformance + a self-contained single-file build = ready to publish.
