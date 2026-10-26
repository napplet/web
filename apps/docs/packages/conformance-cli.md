# @napplet/conformance-cli

> The headless `napplet-conformance` runner — drives the
> [`@napplet/conformance`](./conformance) engine against a napplet in real
> headless Chromium (via Playwright).

`@napplet/conformance-cli` lets a napplet prove it conforms to NIP-5D + the NAP
protocol **before** publishing — locally and in CI. It is a
**development/testing tool**, run from the command line; it is never loaded inside
the napplet sandbox.

- **npm:** [`@napplet/conformance-cli`](https://www.npmjs.com/package/@napplet/conformance-cli)
- **Source:** [packages/conformance-cli](https://github.com/napplet/napplet/tree/main/packages/conformance-cli)

## Usage

```bash
# Build your napplet first, then point the runner at the output:
npx napplet-conformance ./dist
# or a directory containing index.html / a dist/ subdir:
npx napplet-conformance .
# or a remotely-served napplet:
npx napplet-conformance --url https://my.napplet.example/
```

## Wire it up as `test:conformance`

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

`--ui` serves the standalone conformance web runtime (bundled with this package)
plus the napplet, opens your browser, and **re-runs conformance live every time
the napplet changes**. The optional `--exec` runs your build in watch mode so
source edits rebuild and re-check automatically.

## See also

- [`@napplet/conformance`](./conformance) — the engine this CLI drives
- [Getting started](/guide/getting-started) — scaffold, build, and verify a napplet
- [`@napplet/vite-plugin`](./vite-plugin) — generates the manifest the runner validates

The browser runner also supports `npx @napplet/conformance-cli@0.3.3 screenshot [directory|preview-url] --output preview.png`, exposed as `napplet screenshot` by the standalone CLI. See [screenshots and application metadata](./cli.md#screenshots-and-zapstore-metadata) for browser setup, iframe selection, and publication options.

Conformance CLI 0.3.4 requires the published Paja 0.21.x line for GAMEPAD screenshots and compatibility with core/NAP 0.34.0. Paja 0.20.x is excluded because its peer range does not accept those core/NAP versions. Publish this package after its core/NAP dependencies; the standalone CLI runner update follows conformance CLI publication.

## Signed manifests and runtime bindings

Headless runs accept `--manifest ./signed-event.json` alongside a local directory or `--url`. Supply the signed Nostr event itself, not an unsigned build sidecar. The CLI checks its structure, signature, event id and exact raw HTML SHA-256 before starting the browser. It boots the same loaded snapshot in both passes, so a changed response cannot replace the verified artifact. Missing or mismatched manifest inputs exit with code 2; omitting the option leaves manifest checks skipped. UI mode rejects this headless-only option; use a NIP-5D pointer in the web runtime instead.

```sh
napplet-conformance ./dist --manifest ./signed-event.json
```

The CLI and web runtime inject the maintained `@napplet/shim` bindings before subject code. Installation is observed separately from app errors, and private harness observations are excluded from the envelope log. The normal sandbox remains `allow-scripts`; `--allow-same-origin` is a debug setting and correctly fails the sandbox conformance check. Neither domain presence nor manifest declarations grant production permissions. This is implementation guidance; the living [NIP-5D proposal](https://github.com/nostr-protocol/nips/pull/2303) and [NAPs](https://github.com/napplet/naps) define the protocol.
