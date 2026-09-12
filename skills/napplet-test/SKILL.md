---
name: napplet-test
description: Use to verify a napplet before publishing - build, run protocol conformance with napplet-conformance (real Chromium, reference shell), interpret failures, audit the OUTBOX-first boundaries and forbidden browser-authority surfaces, confirm the single-file artifact, run the applet UI checks (no title header, four frame sizes, both themes, minimum notice), scenario smoke tests, Paja preview, and CI wiring. Run after napplet-build, before shipping.
---

# Testing a Napplet

Conformance proves the build speaks NIP-5D inside a real `sandbox="allow-scripts"` iframe driven by a reference shell, catching malformed envelopes, manifest problems, boot failures, and forbidden browser-authority references locally. Truth: NIP-5D (<https://github.com/nostr-protocol/nips/pull/2303>) and the NAPs (<https://github.com/napplet/naps>). A check that fails a spec-faithful napplet but passes only this toolchain is a tooling bug — flag it; do not work around it.

## Step 1 — Build, then test the build

```bash
pnpm verify              # template guidance test + type-check + single-file build
pnpm test:conformance    # napplet-conformance ./dist → exit 0 conformant, 1 non-conformant, 2 usage/runtime error
npx napplet-conformance ./dist        # package-manager agnostic
napplet-conformance --ui ./dist       # live visual report
```

Conformance runs against `./dist` (prefers `dist/index.html`). Never test source.

## Step 2 — Interpret failures (fix the napplet, not the check)

- **Boot failure** — the runtime did not inject `window.napplet` before app code ran, or a top-level throw blocked boot.
- **Malformed envelope** — a message that is not a valid `{ type: "domain.action", … }` for its NAP; re-check the SDK call arguments.
- **Manifest problem** — missing/invalid signed manifest tags. Confirm NIP-5A `d`, `path`, and aggregate `x` tags; hard capabilities are `requires` tags on that event.
- **Forbidden global** — the bundle references `fetch`, `localStorage`, `window.nostr`, `XMLHttpRequest`, `WebSocket`, … (static scan; unreachable references flag too). Replace with `resource` / `storage` / `outbox`, or prove and document a tooling false positive.

## Step 3 — Boundary audit

| Check | Expected |
| --- | --- |
| Normal social reads / publishes | `outbox`, `common`, `lists`, `count`, `dm` — not default `relay` |
| Any `relay.subscribe` / `relay.publish` | A comment or spec note naming the relay-local escape hatch |
| Signing / encryption | No `window.nostr`, keys, local signing, app-owned encryption |
| Relay routing | No NIP-65 resolver, relay pool, WebSocket client, fanout policy in the napplet |
| Network and media bytes | No `fetch`, XHR, WebSocket, external `<img src>`; `resource` instead |
| Persistence | No `localStorage`, IndexedDB, cookies; `storage` instead |
| Optional-domain gating | `window.napplet?.domain` after injection; no `shell.ready()` / `shell.supports()` / service probes |
| `requires` | Bare domain names, hard requirements only; matches the design spec |

```bash
grep -RInE "fetch\\s*\\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|document\\.cookie|window\\.nostr|<img[^>]+src=['\\\"]?https?:|<script[^>]+src=['\\\"]?https?:|<link[^>]+href=['\\\"]?https?:" src dist index.html
```

Any hit in authored or bundled napplet code is removed or explained as a tooling false positive before shipping.

## Step 4 — Artifact

`dist/index.html` is one self-contained file: inline JS, folded assets, no external `<script src>` (opaque-origin `srcdoc` has nothing to fetch). `artifactMode: 'single-file'` produces it; verify by inspecting the file, not by trusting the config.

## Step 5 — Applet UI checks (`napplet-ui`)

Serve through Paja (Step 7) or the conformance UI, then resize the frame / use the browser device toolbar:

| Frame | Must hold |
| --- | --- |
| `200×160` | Primary action reachable, no overflow, no clipped controls, no title header |
| `320×560` | Single column, readable, inline states |
| `900×600` | Full labels, list + detail where the product has one |
| Largest available (or `2400×1200`) | Frame *used*: more rows/columns/detail — not a centered column with dead margins |

At every frame, in both a dark and a light runtime theme: no napplet name / tagline / eyebrow / masthead / footer; `html`, `body`, and root backgrounds follow the theme; loading / empty / error / signed-out states render compact and inline; if a minimum size is declared, the notice appears exactly below it, is readable, and the app resumes intact above it. Record the frames and themes checked.

## Step 6 — Scenario smoke tests

- **Signed-out:** `identity.getPublicKey()` returns `""`; publish / list / DM actions degrade with an inline state.
- **OUTBOX options:** only current fields — `getEvent`: `author`, `relays`, `timeoutMs`; `query` / `subscribe`: `authors`, `relays`, `limit`, `timeoutMs`; `publish`: `relays`, `toOutbox`, `toInboxes`. No `strategy`, subscribe `live`, publish `timeoutMs`, or `outbox.eose`.
- **Optional domain absent:** remove it from the mock runtime; the affordance hides or falls back, nothing else breaks.
- **Theme change:** emit a theme change; the whole surface repaints. A dark card on a white page is a failed integration.
- **Escape hatch:** if `relay` is used, exercise the relay-local behavior and teardown.
- **Teardown:** subscriptions, key bindings, and object URLs are released when the view goes away.

## Step 7 — Runtime preview

```bash
napplet paja -- pnpm vite --host 127.0.0.1
```

Report the Paja URL. If `napplet`, Kehto, or Paja is not installed, report the exact missing prerequisite and leave the manual runtime check open; never present the raw Vite URL as a napplet preview.

## Step 8 — CI

```yaml
- run: pnpm build
- run: npx napplet-conformance ./dist   # non-zero exit fails the job
```

Cache Playwright's Chromium. Green conformance + a clean boundary audit + a self-contained single-file build + the four-frame UI check = ready to publish.
