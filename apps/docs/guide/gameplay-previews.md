# Gameplay previews

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
