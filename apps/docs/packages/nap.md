# @napplet/nap

> Every active napplet NAP domain as layered subpath exports. The package name remains
> `@napplet/nap` for compatibility.

`@napplet/nap` ships every active NAP domain (relay, storage, inc, keys, theme, media, notify, identity, config, resource, cvm, outbox, upload, intent, ble, webrtc, link, count, lists, common, serial, fs, dm) as independent, tree-shakable subpaths. It sits between the shim/sdk and [`@napplet/core`](./core) in the dependency graph.

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

Each domain exposes up to four entry-point shapes. Pick the one that matches what your code actually needs:

| Pattern | Subpath | Contents |
| --- | --- | --- |
| **Barrel** | `@napplet/nap/<domain>` | types + shim installer + SDK helpers |
| **Types-only** | `@napplet/nap/<domain>/types` | pure TypeScript types, zero runtime |
| **Shim** | `@napplet/nap/<domain>/shim` | installer + message handlers (for shells) |
| **SDK** | `@napplet/nap/<domain>/sdk` | named helper functions (for napplet code) |

```ts
// Barrel — everything for a domain
import { installRelayShim, relaySubscribe, RelaySubscribeMessage } from '@napplet/nap/relay';

// Types only — zero runtime cost import type { IncEventMessage } from '@napplet/nap/inc/types';

// Shim only — for shells mounting a NAP into the napplet window import { installStorageShim } from '@napplet/nap/storage/shim';

// SDK only — typed wrapper for napplet consumer code
import { notifySend } from '@napplet/nap/notify/sdk';
```

## Tree-shaking contract

- Published with `sideEffects: false`.
- The `exports` map declares **96 entry points**: 23 active domain barrels,
  23 active-domain types entries, 23 shim entries, 23 sdk entries, plus the
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
- **media** — ownership-aware media sessions with optional context links for
  queue position and related Nostr resources; the shell owns playback policy for
  shell-owned sessions.
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
- **fs** — shell-mediated virtual filesystem access: napplets get `info`/`pickFile`/`pickFiles`/`pickDirectory`/`pickSaveFile`/`stat`/`list`/`read`/`write`/`mkdir`/`remove`/`move`/`watch`/`unwatch`/`onChanged`; the runtime owns host paths, mounts, backing store, normalization, policy, and authorization. Byte payloads use RFC 4648 standard padded base64 text on the JSON wire, and byte limits/counts refer to decoded bytes.
- **intent** — archetype-based invocation through `invoke(uri, options?)` and `open(uri, options?)`, with canonical structured dispatch results.

### INC convention URIs

NAP-INC exposes `emit(topic, payload?)` and `on(topic, callback)`. For `emit('napplet:profile/open?pubkey=abc123')`, the binding transposes the query at the outgoing boundary into the shallow decoded text payload `{ pubkey: 'abc123' }` and posts the stable topic `napplet:profile/open`.

Subscribe with the stable, queryless topic and keep routing exact afterward:

```ts
import { emit, on } from '@napplet/nap/inc/sdk';

emit('napplet:profile/open?pubkey=abc123');
const sub = on('napplet:profile/open', (payload) => {
  // `pubkey` is a local convention choice; validate received payloads here.
  console.log(payload);
});
```

Fragments, malformed percent escapes, repeated decoded names, and a query with an explicit payload reject before emission. Structured or non-text data belongs in the explicit payload of a queryless topic.

### Intent invocation

NAP-INTENT accepts `invoke(uri, options?)` and `open(uri, options?)`:

```ts
import {
  intentAvailable,
  intentOpen,
} from '@napplet/nap/intent/sdk';

if ((await intentAvailable('profile')).available) {
  const result = await intentOpen('napplet:profile/open', { payload: { pubkey: 'abc123' }, behavior: { reuse: false } });
  if (!result.ok) console.error(result.error);
}
```

Intent calls derive archetype and action from the URI. An `ok: true` result means the runtime accepted delivery responsibility and includes the normalized identity and handler catalog identifier; an `ok: false` result includes `error`. Targets receive runtime-attested `IntentDelivery` values through `onDelivery`, including deliveries retained before registration. Behavior hints are `focus` and `reuse`. This non-normative guidance defers to the living [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md).

These APIs defer to the living [NAP-INC](https://github.com/napplet/naps/blob/master/naps/NAP-INC.md) and [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md) documents.

See the [NAP domain reference](/naps/) for the full list with one-line purposes.

## Optional peer dependency

`@napplet/nap` declares `json-schema-to-ts` as an **optional** peer dependency (scoped to the `config` domain's `FromSchema` typing). Install it only if you want schema-inferred typing for your `config.subscribe` callback; skipping it costs nothing.

## See also

- [NAP domain reference](/naps/) — every domain and its purpose
- [`@napplet/sdk`](./sdk) — re-exports the per-domain helpers and message types


### Optional shell environment

The runtime may expose `shell` for environment information. `shell.supports(domain)` reads current domain object presence, `shell.services` is empty until environment delivery, and `shell.ready()` / `shell.onReady(handler)` use the retained snapshot. Readiness does not gate other domain calls. See the living [NAP-SHELL](https://github.com/napplet/naps/blob/master/naps/NAP-SHELL.md).

### Intent delivery and recommendations

```ts
import { intent } from '@napplet/sdk';

intent.onDelivery(({ sender, convention, payload }) => {
  console.log(sender, convention, payload);
});
await intent.invoke('napplet:profile/open?pubkey=abc123');
```

The runtime binding retains deliveries until a listener registers. Discovery candidates expose opaque catalog `id` values and `contracts` with parameter names. INC peers instead use identifiers for running authenticated endpoints. A NAP-INTENT URI may append a bare `#naddr1…` recommendation; the binding sends its coordinate and relay hints as `handlerHint`, outside convention identity and payload. An applicable user default takes precedence. INC URI operations reject fragments. See the living [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md) and [web projection](https://github.com/napplet/naps/blob/master/projections/web.md).