# @napplet/conformance-web

A standalone single-window web runtime for napplet conformance. Point it at a
NIP-19 `nevent` or `naddr` for a NIP-5D napplet manifest event and it runs the
[`@napplet/conformance`](../../packages/conformance) engine **live in your browser**
— the same engine the headless `napplet-conformance` CLI uses — then renders a
per-check pass/fail tree, the recorded envelope log, and a manifest inspector.

```bash
pnpm --filter @napplet/conformance-web dev
# then open the app and enter an naddr/nevent, or deep-link with ?target=…
```

It resolves the signed manifest event from the pointer's relay hints, verifies the
manifest event, fetches and hashes `/index.html` from its Blossom `server` hints,
then loads the verified HTML into a `sandbox="allow-scripts"` iframe. It attaches a
reference shell, records every emitted envelope, and runs a graceful-degradation pass
— all in the page.

HTTP URLs remain supported only as a local development fallback, including legacy
`?url=...` deep links. URL mode cannot prove signed NIP-5D manifest-event checks.

Deployed at `/conformance` alongside the marketing site (see `deploy-site.yml`).
