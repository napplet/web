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
- **intent** — URI-authoritative invocation with immediate acceptance or
  rejection and separate target-only `onDelivery`; discovery exposes queryless
  manifest contracts and optional per-contract event kinds.

### INC convention URIs

NAP-INC exposes `emit(topic, payload?)` and `on(topic, callback)`. For
`emit('napplet:profile/open?pubkey=abc123')`, the binding
transposes the query at the outgoing boundary into the shallow decoded text
payload `{ pubkey: 'abc123' }` and posts the stable topic
`napplet:profile/open`.

Subscribe with the stable, queryless topic and keep routing exact afterward:

```ts
import { emit, on } from '@napplet/nap/inc/sdk';

emit('napplet:profile/open?pubkey=abc123');
const sub = on('napplet:profile/open', (payload) => {
  // `pubkey` is a local convention choice; validate received payloads here.
  console.log(payload);
});
```

Fragments, malformed percent escapes, repeated decoded names, and a query with
an explicit payload reject before emission. Structured or non-text data belongs
in the explicit payload of a queryless topic.

### Intent invocation and delivery

NAP-INTENT accepts the same authoritative URI syntax at its own `invoke` and
`open` boundary. It derives the archetype, action, queryless convention, and
optional text payload before posting the normalized request:

```ts
import {
  intentAvailable,
  intentOnDelivery,
  intentOpen,
} from '@napplet/nap/intent/sdk';

const deliveries = intentOnDelivery((delivery) => {
  // Runtime-attested provenance is not payload validation.
  console.log(delivery.sender, delivery.convention);
  validateProfileOpenPayload(delivery.payload);
});

if ((await intentAvailable('profile')).available) {
  const result = await intentOpen('napplet:profile/open?pubkey=abc123');
  if (!result.ok) console.error(result.error);
}
```

`ok: true` records acceptance of runtime delivery responsibility only. A target
delivery arrives separately through `onDelivery`, carries no intent or delivery
identifier, and does not depend on the source remaining alive or on NAP-INC.
Register the target listener during startup so a retained delivery can be
drained promptly; runtime overlap, replacement, retry, and persistence remain
host policy.

Manifest discovery stays queryless. Each archetype tag maps to one
`IntentContract`, with optional same-tag `eventKinds`; payload content never
selects or infers a kind.

These APIs follow [NAP-INC PR #89
(`4593ce9`)](https://github.com/napplet/naps/pull/89/commits/4593ce9e301ce098fd3dad64206fcd6f144fa7af),
[the web projection PR #90
(`896c32c`)](https://github.com/napplet/naps/pull/90/commits/896c32c92deee68dc4d10fc1132b62df20cccb6f),
and [NAP-INTENT PR #91
(`a718915`)](https://github.com/napplet/naps/pull/91/commits/a718915ddefa2f03a0126579601f59d8bd86f7c4)
at those exact draft heads.

See the [NAP domain reference](/naps/) for the full list with one-line purposes.

## Optional peer dependency

`@napplet/nap` declares `json-schema-to-ts` as an **optional** peer dependency
(scoped to the `config` domain's `FromSchema` typing). Install it only if you want
schema-inferred typing for your `config.subscribe` callback; skipping it costs
nothing.

## See also

- [NAP domain reference](/naps/) — every domain and its purpose
- [`@napplet/sdk`](./sdk) — re-exports the per-domain helpers and message types
