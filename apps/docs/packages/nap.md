# @napplet/nap

> All 16 napplet NAP domains as layered subpath exports. The package name remains
> `@napplet/nap` for compatibility.

`@napplet/nap` ships every NAP domain (relay, storage, inc, keys, theme, media,
notify, identity, config, resource, connect, class, cvm, outbox, upload, intent)
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
- The `exports` map declares **62 entry points**: 16 domain barrels, 16
  types entries, and 15 shim + 15 sdk entries (theme is types-only — see below).
- A bundler importing only `@napplet/nap/relay/types` produces zero bytes from
  the other domains.

## Theme exception

Theme is **types-only** today — only `@napplet/nap/theme` (barrel, re-exporting
`./types`) and `@napplet/nap/theme/types` exist. There is no theme `shim` or
`sdk` entry; shell-side theme handling stays in the host shell.

## Domain notes

- **resource** — a single scheme-pluggable byte-fetching primitive,
  `bytes(url) → Blob`, over four canonical schemes (`data:`, `https:`,
  `blossom:sha256:<hex>`, `nostr:<bech32>`).
- **identity** — strictly **read-only**: it exposes the shell-user pubkey and
  public identity data but never signs, encrypts, or decrypts. Take one snapshot
  with `getPublicKey()`, then subscribe to shell-pushed `identity.changed`.
- **connect** — state-only, **no postMessage wire**. Grants flow through the
  shell-served CSP plus a `<meta name="napplet-connect-granted">` tag read at
  install time. Runtime state is `{ granted, origins }`, never `undefined`.
- **class** — a single shell → napplet `class.assigned` envelope writes an integer
  to `window.napplet.class` (or it stays `undefined`).

See the [NAP domain reference](/naps/) for the full list with one-line purposes.

## Optional peer dependency

`@napplet/nap` declares `json-schema-to-ts` as an **optional** peer dependency
(scoped to the `config` domain's `FromSchema` typing). Install it only if you want
schema-inferred typing for your `config.subscribe` callback; skipping it costs
nothing.

## See also

- [NAP domain reference](/naps/) — every domain and its purpose
- [`@napplet/sdk`](./sdk) — re-exports the per-domain helpers and message types
