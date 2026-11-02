# Security Lab (`@napplet/lab-security`)

A [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303) napplet that audits
the shell hosting it. It runs a catalogue of probes against the iframe sandbox,
the shell-injected Content-Security-Policy, the `window.napplet` namespace, and
the NAP domains, and reports each boundary as **pass**, **fail**, **warning**,
or **info** with the evidence it saw.

It is meant to be installed into any NIP-5D runtime (Kehto Paja, Hyprgate, your
own shell) and read like a conformance report for *the shell*, from the inside.
It is the first napplet in [`@napplet/lab`](../../README.md), the monorepo's
tooling for probing napplets and shells.

## Reading the table

| Status | Meaning |
| --- | --- |
| pass | The boundary held: a NIP-5D MUST was honoured or a SHOULD was followed. |
| fail | A NIP-5D MUST / MUST NOT was violated. |
| warning | A SHOULD was not followed, or a runtime-mediated path could not be confirmed. |
| info | Observation only: a documented non-guarantee (`parent.length`, WebRTC) or an allowed capability (WebAssembly). |
| skipped | Not applicable here (for example an optional domain the shell does not expose). |

Every row names the NIP-5D section it traces to.

By default the table shows only Run, Status, Probe, Observed and Evidence.
The **columns** button in the header opens a panel to show or hide the rest
(level, category, expected boundary, spec, expected result, severity, owner,
last run). When the shell exposes NAP-STORAGE the choice is saved under
`lab.preferences.v1` and restored next time; without that domain it lives for
the session only, since browser storage is unavailable in a NIP-5D sandbox.

## Probe levels

- **Baseline**: browser-enforced boundaries that need no shell cooperation.
  Opaque origin, srcdoc delivery, referrer, the CSP meta (presence, position,
  baseline directives, no `'unsafe-eval'`), `eval`/`Function`/dynamic import,
  storage APIs, direct network (fetch, XHR, WebSocket, EventSource), external
  subresources, workers, child frames, forms, `<base>`, popups, and the NIP-07
  global.
- **Runtime mediated**: the injected namespace is the only sanctioned way out.
  `window.napplet` is present, holds only domain objects, leaks no `MessagePort`,
  exposes every manifest `R` domain, and the declared domains (identity, relay,
  inc, storage, resource, theme) round-trip over the NAP port.
- **Safe adversarial**: hostile-looking actions a compliant shell survives.
  A nested srcdoc frame tries its own `napplet.hello` toward the shell (it MUST
  be dropped), parent/top traversal, prototype pollution, inert script injection,
  ambient signer/encrypt/publish lookups, plus the two documented gaps.
- **Destructive**: actions NIP-5D §Identity says the shell MUST answer by
  revoking the napplet: a window-level message after the handoff, a forged
  result envelope, a second `napplet.hello`, self-navigation to `about:blank`,
  and self-navigation to an unverified `blob:` document with script (the case
  [kehto/web#382](https://github.com/kehto/web/pull/382) closes with a host-page
  `frame-src 'none'`). The blob probe is the one to watch by eye: a locked host
  refuses the navigation, an unlocked NIP-5D shell revokes on the second load,
  and a red "UNVERIFIED DOCUMENT IN THE NAPPLET FRAME" banner that stays on
  screen means neither protection exists. These are never part of "run all". Their run button fires immediately; a compliant
  shell removes the lab (Paja logs `paja.napplet.revoked`), so the row never
  gets a result. If the row is still alive when its timer fires, the shell
  did not revoke, and that is the finding.

## Development

From the monorepo root (`pnpm install` once):

```bash
pnpm --filter @napplet/lab-security test:unit    # unit tests (vitest, jsdom)
pnpm --filter @napplet/lab-security type-check
pnpm --filter @napplet/lab-security build        # single-file dist/index.html + dist/.nip5a-manifest.json
pnpm --filter @napplet/lab-security paja         # Kehto Paja + Vite dev server on 127.0.0.1:9504
pnpm --filter @napplet/lab-security conformance  # napplet-conformance against dist/
pnpm --filter @napplet/lab-security test:paja    # build, then load dist/ into Paja's runtime-pointer host headlessly
pnpm --filter @napplet/lab-security verify       # type-check + unit tests + build + Paja check
```

`pnpm test:paja` drives the exact path a published napplet takes (verified
bytes in `srcdoc`, shell-injected CSP first in head, port-only NAP traffic):
it requires every non-destructive probe to finish without a `fail` row and
without Paja revoking the lab, then runs each destructive probe on a fresh
load and requires Paja to revoke with a NIP-5D reason and leave no replacement
document rendering. Set `LAB_HOST_FRAME_LOCK=1` to emulate the kehto/web#382
host-page `frame-src 'none'` until a Paja release ships it, and
`LAB_DESTRUCTIVE=<id,id>` to choose which destructive probes run. It needs a Playwright Chromium
(`npx playwright install chromium`).

In Paja's dev mode (`pnpm paja`, Vite target URL) no CSP is injected, so the
CSP rows report warnings and network probes read "Denied without CSP". That is
Paja's dev-mode policy, not a lab bug; the production path above is the one to
trust.

`napplet-conformance` reports `boot/no-forbidden-globals` as a failure for this
napplet by design: the lab touches `fetch`, `WebSocket`, `localStorage`, the
NIP-07 global and friends precisely to prove they are blocked. Every other
check passes; treat that one as expected for this artifact.

## Publishing

`.napplet/config.yaml` holds the publishing settings for the `napplet` CLI
(named target `security-lab`, kind `35129`). From this directory, inspect the
plan with `napplet debug`, then publish with `napplet deploy` (use `--dry-run`
first).

`napplet deploy` captures a store screenshot by loading the artifact in a
preview harness that injects no CSP, so a capture taken mid-run shows red
rows. Pass `--screenshot-ready-selector '[data-run-state="done"]'` to wait
for the full non-destructive run, or `--no-screenshot` to keep the previous
image.

Relay hints baked into the published naddr come from `relays:` in the config.
Keep only relays that answer; a dead hint can make a runtime's pointer
resolution fail before EOSE.

Manifest facts come from `src/lib/manifest.ts`, which both `vite.config.ts`
and the "declared R domains are exposed" probe read, so the signed manifest and
the runtime check cannot drift apart.

## Why window-level messages are off limits

NIP-5D reserves window-level `postMessage` for the single `napplet.hello`
handoff. Anything else from the frame is evidence that the verified document
was replaced, and the shell MUST revoke. Theme is therefore read through
NAP-THEME over the port (`themeGet` / `themeOnChanged` from `@napplet/sdk`), and
the unit tests assert that no non-destructive source file posts to `parent`.
