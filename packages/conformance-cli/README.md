# @napplet/conformance-cli

The headless `napplet-conformance` runner. It drives the
[`@napplet/conformance`](../conformance) engine against a napplet in real headless
Chromium (via Playwright), so a napplet can prove it conforms to the NAP protocol
**before** publishing — locally and in CI.

The runner validates NIP-5D/NAP envelope and manifest carriers. It does not
define payload schemas or matching behavior for an archetype convention. Intent
acceptance and target delivery are distinct: the reference shell uses an
authenticated endpoint fixture for sender provenance, returns acceptance first,
and queues a separate no-ID target delivery. Payloads remain untrusted.

Archetype metadata is one queryless convention per tag with optional trailing
same-tag `kind:<number>` discovery fields; kinds are not inferred from payloads.
This non-normative description follows the adopted [NAP-INC #89
`4593ce9`](https://github.com/napplet/naps/blob/4593ce9e301ce098fd3dad64206fcd6f144fa7af/naps/NAP-INC.md),
[URI terminology #90 `896c32c`](https://github.com/napplet/naps/commit/896c32c92deee68dc4d10fc1132b62df20cccb6f),
and [NAP-INTENT #91
`a718915`](https://github.com/napplet/naps/blob/a718915ddefa2f03a0126579601f59d8bd86f7c4/naps/NAP-INTENT.md).

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

`--ui` serves the standalone conformance web runtime (bundled with this package) plus
the napplet, opens your browser, and **re-runs conformance live every time the napplet
changes**. The optional `--exec` runs your build in watch mode so source edits rebuild
the served `./dist`; the CLI's file watcher then triggers a fresh run — edit, save, see
the verdict update. Useful flags: `--port <n>`, `--no-open`. (Headless mode is
unchanged — `--ui` is purely additive.)

## How it works

1. Serves your built napplet on loopback alongside a host harness page and the
   bundled engine. Every response sends `Access-Control-Allow-Origin: *` so the
   sandboxed napplet's module scripts load across its opaque origin.
2. Launches headless Chromium, loads the napplet into a `sandbox="allow-scripts"`
   iframe (no `allow-same-origin`), attaches a reference shell, and records every
   envelope the napplet emits — plus a second no-capability pass to prove graceful
   degradation.
3. Assembles the conformance context (manifest + static `window.nostr` scan), runs
   the check catalog, prints the report, and exits non-zero on any error-severity
   failure.

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
