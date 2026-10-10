# @napplet/conformance-cli

The headless `napplet-conformance` runner. It drives the [`@napplet/conformance`](../conformance) engine against a napplet in real headless Chromium (via Playwright), so a napplet can prove it conforms to the NAP protocol **before** publishing — locally and in CI.

The runner validates NIP-5D/NAP envelope and manifest carriers. It does not define payload schemas or matching behavior for an archetype convention. The reference shell returns the canonical structured intent result. Payloads remain untrusted.

Archetype metadata is one queryless convention per tag. This non-normative description follows [NAP-INC](https://github.com/napplet/naps/blob/master/naps/NAP-INC.md), [the archetype registry](https://github.com/napplet/naps/blob/master/ARCHETYPES.md), and [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md).

```bash
# Build your napplet first, then:
npx napplet-conformance ./dist
# or point at a directory containing index.html / a dist/ subdir:
npx napplet-conformance .
# or a remotely-served napplet:
npx napplet-conformance --url https://my.napplet.example/
```

Wire it into any package manager as `test:conformance`:

```jsonc
{
  "scripts": {
    "test:conformance": "napplet-conformance ./dist",
    "test:conformance:ui": "napplet-conformance --ui . --exec \"vite build --watch\""
  }
}
```

```bash
pnpm test:conformance   # npm / yarn / bun all work — the bin is PM-agnostic
```

## UI / watch mode (`--ui`) — like `vitest --ui`

```bash
napplet-conformance --ui . --exec "vite build --watch"
```

`--ui` serves the standalone conformance web runtime (bundled with this package) plus the napplet, opens your browser, and **re-runs conformance live every time the napplet changes**. The optional `--exec` runs your build in watch mode so source edits rebuild the served `./dist`; the CLI's file watcher then triggers a fresh run — edit, save, see the verdict update. Useful flags: `--port <n>`, `--no-open`. (Headless mode is unchanged — `--ui` is purely additive.)

## How it works

1. Serves your built napplet on loopback alongside a host harness page and the bundled engine. Every response sends `Access-Control-Allow-Origin: *` so the sandboxed napplet's module scripts load across its opaque origin.
2. Launches headless Chromium, loads the napplet into a `sandbox="allow-scripts"` iframe (no `allow-same-origin`), attaches a reference shell, and records every envelope the napplet emits — plus a second no-capability pass to prove graceful degradation.
3. Assembles the conformance context (manifest + static `window.nostr` scan), runs the check catalog, prints the report, and exits non-zero on any error-severity failure.

## Options

```
--url <url>            Test a remotely-served napplet instead of a local dir
--reporter <fmt>       pretty | json | junit            (default: pretty)
--out <file>           Write the report to a file instead of stdout
--ready-timeout <ms>   Boot timeout waiting for iframe load (default: 5000)
--settle <ms>          Envelope-collection window after boot (default: 600)
--no-degraded          Skip the graceful-degradation pass
--allow-same-origin    Debug only (a conformant napplet must not need it)
-h, --help             Show help
```

Exit codes: `0` conformant, `1` non-conformant, `2` usage/runtime error.

> Requires Playwright's Chromium. In CI, run `npx playwright install --with-deps chromium`
> once before invoking the CLI. This package is npm-only (Playwright is not
> JSR-friendly); the pure engine `@napplet/conformance` is published to both.

## Capture a preview screenshot

The CLI also provides the browser runner for `napplet screenshot`. Run `npx @napplet/conformance-cli@0.3.3 screenshot --output preview.png` from a built project; it prefers `dist/index.html` and starts a temporary Kehto Paja preview automatically. Supply a project directory or an HTTP(S) shell URL to override the target. Use `--selector` to select one iframe, `--ready-selector` to wait for an element inside it, and `--width`, `--height`, or `--delay` to adjust the default 1200 × 750 capture after 1500 ms. Existing output files are preserved. Chromium is installed automatically on first use. Local previews use Paja's development identity and live relays, and close after capture or failure.
