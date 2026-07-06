# @napplet/nap

> Every active napplet NAP domain as layered subpath exports. The package name remains
> `@napplet/nap` for compatibility.

`@napplet/nap` ships every active NAP domain (relay, storage, inc, keys, theme,
media, notify, identity, config, resource, cvm, outbox, upload, intent, ble,
webrtc, link, count, lists, common, serial, dm)
as independent, tree-shakable subpaths. It sits between the shim/sdk and
[`@napplet/core`](./core) in the dependency graph.

- **npm:** [`@napplet/nap`](https://www.npmjs.com/package/@napplet/nap)
- **JSR:** [`@napplet/nap`](https://jsr.io/@napplet/nap)
- **Source:** [packages/nap](https://github.com/napplet/napplet/tree/main/packages/nap)

## Install

```bash
pnpm add @napplet/nap
```

::: warning No root export
`@napplet/nap` has **no root export** — you must import from a domain subpath.
`import '@napplet/nap'` fails with `ERR_PACKAGE_PATH_NOT_EXPORTED` by design.
:::

## Subpath patterns

Each domain exposes up to four entry-point shapes. Pick the one that matches what
your code actually needs:

| Pattern | Subpath | Contents |
| --- | --- | --- |
| **Barrel** | `@napplet/nap/<domain>` | types + shim installer + SDK helpers |
| **Types-only** | `@napplet/nap/<domain>/types` | pure TypeScript types, zero runtime |
| **Shim** | `@napplet/nap/<domain>/shim` | installer + message handlers (for shells) |
| **SDK** | `@napplet/nap/<domain>/sdk` | named helper functions (for napplet code) |

```ts
// Barrel — everything for a domain
import { installRelayShim, relaySubscribe, RelaySubscribeMessage } from '@napplet/nap/relay';

// Types only — zero runtime cost
import type { IncEventMessage } from '@napplet/nap/inc/types';

// Shim only — for shells mounting a NAP into the napplet window
import { installStorageShim } from '@napplet/nap/storage/shim';

// SDK only — typed wrapper for napplet consumer code
import { notifySend } from '@napplet/nap/notify/sdk';
```

## Tree-shaking contract

- Published with `sideEffects: false`.
- The `exports` map declares **92 entry points**: 22 active domain barrels,
  22 active-domain types entries, 22 shim entries, 22 sdk entries, plus the
  `ifc` compatibility wrapper.
- A bundler importing only `@napplet/nap/relay/types` produces zero bytes from
  the other domains.

## Domain notes

- **resource** — a single scheme-pluggable byte-fetching primitive,
  `bytes(url) → Blob`, over four canonical schemes (`data:`, `https:`,
  `blossom:sha256:<hex>`, `nostr:<bech32>`).
- **identity** — strictly **read-only**: it exposes the shell-user pubkey and
  public identity data but never signs, encrypts, or decrypts. Take one snapshot
  with `getPublicKey()`, then subscribe to shell-pushed `identity.changed`.
- **ble** — runtime-mediated Bluetooth LE/GATT sessions. Napplets use
  shell-scoped sessions and byte arrays while the shell owns chooser UI,
  permissions, device handles, GATT lifecycle, notifications, and policy.
- **webrtc** — runtime-mediated WebRTC data sessions. Napplets use shell-scoped
  sessions while the shell owns signaling, SDP, ICE, and peer-connection
  lifecycle.
- **link** — shell-mediated external navigation via `open(url, options?)`. The
  shell owns prompting, policy, opener isolation, and browser context.
- **count** — runtime-mediated event counts via `query(filters, options?)`. The
  runtime owns relay COUNT support, indexing, aggregation, approximation, and
  refusal policy.
- **lists** — runtime-mediated NIP-51 list mutations via
  `supported`/`add`/`remove`; the runtime owns lookup, merge, encryption,
  signing, and publishing.
- **common** — shell-mediated public NIP-19 helpers, profile lookup returning
  `RelayEventResult`, follows, follow/unfollow, reactions, and reports; the
  shell owns identity, consent, event construction, signing, publishing, relay
  access, and NIP-19 handling.
- **serial** — runtime-mediated serial device access: napplets get
  `open`/`write`/`close`/`onEvent`; the shell owns permissions, raw port
  handles, streams, OS paths, and lifecycle policy.

See the [NAP domain reference](/naps/) for the full list with one-line purposes.

## Optional peer dependency

`@napplet/nap` declares `json-schema-to-ts` as an **optional** peer dependency
(scoped to the `config` domain's `FromSchema` typing). Install it only if you want
schema-inferred typing for your `config.subscribe` callback; skipping it costs
nothing.

## See also

- [NAP domain reference](/naps/) — every domain and its purpose
- [`@napplet/sdk`](./sdk) — re-exports the per-domain helpers and message types
