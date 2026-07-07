# @napplet/conformance-web

> Browser conformance runtime for live napplet protocol testing.

`@napplet/conformance-web` is the single-window web runtime that powers the
deployed [`/conformance`](https://napplet.run/conformance/) app and the
`napplet-conformance --ui` watch mode. Point it at a napplet URL and it runs the
[`@napplet/conformance`](./conformance) engine live in the browser, then renders
a per-check pass/fail tree, the recorded envelope log, and a manifest inspector.

- **npm:** [`@napplet/conformance-web`](https://www.npmjs.com/package/@napplet/conformance-web)
- **Source:** [apps/conformance](https://github.com/napplet/napplet/tree/main/apps/conformance)

## Use the hosted app

Open the browser runtime at:

```text
https://napplet.run/conformance/
```

Enter a napplet URL, or deep-link with `?url=...`.

## Run through the CLI

Most local workflows should use the Playwright-backed CLI wrapper:

```bash
napplet-conformance --ui . --exec "vite build --watch"
```

`--ui` serves this web runtime plus the napplet under test, opens your browser,
and re-runs conformance every time the served napplet changes.

## Local development

From this repository:

```bash
pnpm --filter @napplet/conformance-web dev
```

The app loads the napplet into a `sandbox="allow-scripts"` iframe, attaches a
reference shell, records every emitted envelope, and runs the same checks as the
headless runner.

::: tip
For CI, use [`@napplet/conformance-cli`](./conformance-cli). It serves the
napplet with the right local headers and exits non-zero on failures.
:::

## See also

- [`@napplet/conformance`](./conformance) — the engine this runtime executes.
- [`@napplet/conformance-cli`](./conformance-cli) — the headless and UI/watch
  runner that bundles this runtime.
