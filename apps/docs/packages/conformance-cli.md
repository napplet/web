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
