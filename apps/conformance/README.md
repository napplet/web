# @napplet/conformance-web

A standalone single-window web runtime for napplet conformance. Point it at a
napplet URL and it runs the [`@napplet/conformance`](../../packages/conformance)
engine **live in your browser** — the same engine the headless `napplet-conformance`
CLI uses — then renders a per-check pass/fail tree, the recorded envelope log, and a
manifest inspector.

```bash
pnpm --filter @napplet/conformance-web dev
# then open the app and enter a napplet URL, or deep-link with ?url=…
```

It loads the napplet into a `sandbox="allow-scripts"` iframe, attaches a reference
shell, records every emitted envelope, and runs a graceful-degradation pass — all in
the page.

> The napplet must be served with permissive CORS (`Access-Control-Allow-Origin: *`)
> so its module scripts load across the sandbox's opaque origin and its manifest can
> be fetched. For an authoritative, CI-friendly run, use `@napplet/conformance-cli`,
> which serves the napplet locally with the right headers.

Deployed at `/conformance` alongside the marketing site (see `deploy-site.yml`).
