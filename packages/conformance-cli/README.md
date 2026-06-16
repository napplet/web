# @napplet/conformance-cli

The headless `napplet-conformance` runner. It drives the
[`@napplet/conformance`](../conformance) engine against a napplet in real headless
Chromium (via Playwright), so a napplet can prove it conforms to the NAP protocol
**before** publishing — locally and in CI.

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
    "test:conformance": "napplet-conformance ./dist"
  }
}
```

```bash
pnpm test:conformance   # npm / yarn / bun all work — the bin is PM-agnostic
```

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
--ready-timeout <ms>   Boot timeout waiting for shell.ready (default: 5000)
--settle <ms>          Envelope-collection window after boot (default: 600)
--no-degraded          Skip the graceful-degradation pass
--allow-same-origin    Debug only (a conformant napplet must not need it)
-h, --help             Show help
```

Exit codes: `0` conformant, `1` non-conformant, `2` usage/runtime error.

> Requires Playwright's Chromium. In CI, run `npx playwright install --with-deps chromium`
> once before invoking the CLI. This package is npm-only (Playwright is not
> JSR-friendly); the pure engine `@napplet/conformance` is published to both.
