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

## Short gameplay previews

After building, configure `zapstore.id` and `zapstore.name` in `.napplet/config.json`, then capture and review a clip:

```bash
napplet record --interactive --output gameplay.webm
napplet deploy --zapstore --dry-run --json
napplet deploy --zapstore
```

`--interactive` opens a new Chromium window showing the frozen build. Play until the desired scene, then select **Record next 6 seconds**. Closing the window cancels capture. The host controls are removed before recording. This records a fresh session, not your existing Paja tab. Interactive capture requires a graphical desktop; headless environments can use input recipes.

For agent-driven capture, save a JSON action array and run `napplet record --actions capture.json --output gameplay.webm`. Times are milliseconds from recording start; click coordinates are viewport pixels. Supported actions are `click`, `keyDown`, and `keyUp`. Use arrows, Space, Enter, Escape, lowercase letters, or digits as keys. Review the result: a successful recording can still show an uninteresting loading screen.

```json
[
  { "type": "click", "atMs": 200, "x": 480, "y": 300 },
  { "type": "keyDown", "atMs": 1000, "key": "ArrowRight" },
  { "type": "keyUp", "atMs": 4500, "key": "ArrowRight" }
]
```

The default is a silent WebM with a six-second action interval, a 960 × 600 viewport, and a 1500 ms startup delay. Use `--duration`, `--width`, `--height`, `--delay`, and `--ready-selector` to choose the scene. Playwright may append a held final frame; the sidecar reports the actual encoded duration. Capture allows 1–30 second intervals, dimensions from 64–1920 pixels, at most 128 actions, and files up to 20 MiB. These are authoring-tool limits, not protocol conformance requirements. Particular catalogs may accept smaller clips.

Capture writes `gameplay.webm`, `gameplay.webm.png`, and `gameplay.webm.json` without replacing existing files, and selects the clip under `zapstore.video`. Keep these files outside the build directory. A changed build or modified clip stops video publication before uploads; record a new filename or use `napplet record --clear` to deselect it while keeping the files. Publishing remains optional through `--zapstore`; `--no-zapstore` omits application media. Recording preserves configured cover images and supplies its PNG as a fallback when no cover is configured.

The standalone CLI installs and caches its own Node, Chromium, and encoder tooling; no global Node or FFmpeg is required. First use needs network access. A recording still runs the napplet through the normal Paja development runtime, whose available services may use live relays.

Video uploads reuse Blossom and the existing kind-32267 application event. Its content includes the video URL, with matching [NIP-92](https://github.com/nostr-protocol/nips/blob/master/92.md) `imeta` fields for MIME, SHA-256, size, dimensions, thumbnail, and description. The existing manifest `app` link remains the [pending application-reference proposal](https://github.com/dskvr/nips/pull/11); neither recording nor video metadata introduces a NIP-5D manifest tag or NAP. Rendering depends on the receiving catalog. Clients that ignore video can retain the ordinary image cover.
