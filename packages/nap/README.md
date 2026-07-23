# @napplet/nap

> Every active napplet NAP domain (relay, storage, inc, keys, theme, media, notify, identity, config, resource, cvm, outbox, upload, intent, ble, webrtc, link, count, lists, serial, common, dm) as layered subpath exports. The package name remains `@napplet/nap` for compatibility.

## Install

```bash
pnpm add @napplet/nap
```

`@napplet/nap` has no root export — consumers MUST import from a domain subpath. See [Subpath Patterns](#subpath-patterns) for the available entry-point shapes per domain.

## Quick Start

```ts
// Barrel — types + shim installer + sdk helper together
import { installOutboxShim, outboxQuery, OutboxQueryMessage } from '@napplet/nap/outbox';
```

```ts
// Granular — types only (zero runtime cost)
import type { IncEventMessage } from '@napplet/nap/inc/types';
```

Runtime code that needs only a domain shim imports the shim subpath directly.
Napplet application code should not call shim installers; it consumes the
runtime-injected `window.napplet.<domain>` object through `@napplet/sdk` or the
domain SDK helpers.

```ts
// Granular — shim installer only (no SDK helpers bundled)
import { installStorageShim } from '@napplet/nap/storage/shim';
```

Napplet authors that want a typed wrapper over `window.napplet` without the installer pull from the SDK subpath:

```ts
// Granular — SDK helpers only (no shim installer bundled)
import { notifySend } from '@napplet/nap/notify/sdk';
```

End-to-end: a napplet queries outbox-aware event data using the SDK helper. The
runtime must inject `window.napplet.outbox` before app code runs; the napplet does
not construct that object itself.

```ts
// In the napplet (runs inside the sandboxed iframe)
import { outboxQuery, outboxSubscribe } from '@napplet/nap/outbox/sdk';

const { events } = await outboxQuery(
  [{ kinds: [1], limit: 20 }],
  { timeoutMs: 3000 },
);
for (const result of events) console.log('note', result.event);

const sub = outboxSubscribe([{ kinds: [1], limit: 20 }], { timeoutMs: 3000 });
sub.on('event', (result) => console.log('new note', result.event));
sub.close();
```

## 22 Active Domains

Each domain is an independent subpath. Barrel imports bundle types + shim installer + SDK helpers; granular subpaths isolate each surface.

| Domain | Barrel | Types | Shim | SDK | Purpose |
|--------|--------|-------|------|-----|---------|
| relay | `@napplet/nap/relay` | `@napplet/nap/relay/types` | `@napplet/nap/relay/shim` | `@napplet/nap/relay/sdk` | Low-level Nostr relay proxy for explicit relay-local behavior (subscribe/publish/query) |
| storage | `@napplet/nap/storage` | `@napplet/nap/storage/types` | `@napplet/nap/storage/shim` | `@napplet/nap/storage/sdk` | Scoped key-value storage |
| inc | `@napplet/nap/inc` | `@napplet/nap/inc/types` | `@napplet/nap/inc/shim` | `@napplet/nap/inc/sdk` | Inter-napplet communication (topic pub/sub) |
| keys | `@napplet/nap/keys` | `@napplet/nap/keys/types` | `@napplet/nap/keys/shim` | `@napplet/nap/keys/sdk` | Keyboard bindings + action registration |
| theme | `@napplet/nap/theme` | `@napplet/nap/theme/types` | — | — | Read-only shell theme access (types-only today) |
| media | `@napplet/nap/media` | `@napplet/nap/media/types` | `@napplet/nap/media/shim` | `@napplet/nap/media/sdk` | Ownership-aware media sessions with context links + playback |
| notify | `@napplet/nap/notify` | `@napplet/nap/notify/types` | `@napplet/nap/notify/shim` | `@napplet/nap/notify/sdk` | Shell-rendered notifications |
| identity | `@napplet/nap/identity` | `@napplet/nap/identity/types` | `@napplet/nap/identity/shim` | `@napplet/nap/identity/sdk` | Read-only user queries (pubkey, metadata) |
| config | `@napplet/nap/config` | `@napplet/nap/config/types` | `@napplet/nap/config/shim` | `@napplet/nap/config/sdk` | Declarative per-napplet config (schema-driven) |
| resource | `@napplet/nap/resource` | `@napplet/nap/resource/types` | `@napplet/nap/resource/shim` | `@napplet/nap/resource/sdk` | Sandboxed byte fetching (https/blossom/nostr/data) via `bytes(url) → Blob` |
| cvm | `@napplet/nap/cvm` | `@napplet/nap/cvm/types` | `@napplet/nap/cvm/shim` | `@napplet/nap/cvm/sdk` | Native ContextVM bridge — MCP-over-Nostr (`discover`/`listTools`/`callTool`/`listResources`/`readResource`/`registry.*`); shell owns transport, registry selection, and tool policy |
| outbox | `@napplet/nap/outbox` | `@napplet/nap/outbox/types` | `@napplet/nap/outbox/shim` | `@napplet/nap/outbox/sdk` | Outbox-aware relay routing — `getEvent`/`query`/`subscribe`/`publish`/`resolveRelays`; shell owns NIP-65 relay discovery, dedup, and fanout |
| upload | `@napplet/nap/upload` | `@napplet/nap/upload/types` | `@napplet/nap/upload/shim` | `@napplet/nap/upload/sdk` | Shell-mediated file/blob upload — `info`/`upload`/`status`/`onStatus` over NIP-96 + Blossom rails; shell signs auth, returns NIP-94 metadata |
| intent | `@napplet/nap/intent` | `@napplet/nap/intent/types` | `@napplet/nap/intent/shim` | `@napplet/nap/intent/sdk` | Archetype intent dispatch — `invoke`/`open`/`available`/`handlers`/`onChanged`; invoke another napplet by role, shell resolves the default handler |
| ble | `@napplet/nap/ble` | `@napplet/nap/ble/types` | `@napplet/nap/ble/shim` | `@napplet/nap/ble/sdk` | Runtime-mediated Bluetooth LE/GATT sessions — `open`/`services`/`read`/`write`/`subscribe`/`unsubscribe`/`close`/`onEvent`; shell owns chooser UI, permissions, device handles, and lifecycle |
| webrtc | `@napplet/nap/webrtc` | `@napplet/nap/webrtc/types` | `@napplet/nap/webrtc/shim` | `@napplet/nap/webrtc/sdk` | Runtime-mediated WebRTC data sessions — `open`/`send`/`close`/`onEvent`; shell owns signaling, SDP, ICE, and peer-connection lifecycle |
| link | `@napplet/nap/link` | `@napplet/nap/link/types` | `@napplet/nap/link/shim` | `@napplet/nap/link/sdk` | Shell-mediated external link opening — `open(url, options?)`; shell owns navigation, policy, prompting, and opener isolation |
| count | `@napplet/nap/count` | `@napplet/nap/count/types` | `@napplet/nap/count/shim` | `@napplet/nap/count/sdk` | Runtime-mediated event counts — `query(filters, options?)`; shell owns relay COUNT support, indexes, aggregation, approximation, and refusal policy |
| lists | `@napplet/nap/lists` | `@napplet/nap/lists/types` | `@napplet/nap/lists/shim` | `@napplet/nap/lists/sdk` | Runtime-mediated NIP-51 list mutations — `supported`/`add`/`remove`; runtime owns lookup, merge, encryption, signing, and publishing |
| common | `@napplet/nap/common` | `@napplet/nap/common/types` | `@napplet/nap/common/shim` | `@napplet/nap/common/sdk` | Common social actions — public NIP-19 helpers, profile lookup returning `RelayEventResult`, follows, follow/unfollow, reactions, and reports; shell owns identity/signing/publishing |
| serial | `@napplet/nap/serial` | `@napplet/nap/serial/types` | `@napplet/nap/serial/shim` | `@napplet/nap/serial/sdk` | Runtime-mediated serial device access — `open`/`write`/`close`/`onEvent`; shell owns permissions, port handles, streams, and lifecycle |
| dm | `@napplet/nap/dm` | `@napplet/nap/dm/types` | `@napplet/nap/dm/shim` | `@napplet/nap/dm/sdk` | Runtime-mediated direct messages — `status`/`conversations`/`messages`/`send`/`subscribe`/`unsubscribe`/`onMessage`; shell owns signing, encryption, relay routing, storage, and policy |

### Deprecated IFC Compatibility

NAP-IFC was renamed to NAP-INC because the surface is inter-napplet communication, not generic inter-frame communication. New code must use `@napplet/nap/inc`, `window.napplet.inc`, the `inc.*` wire messages, and the `Inc*` TypeScript names.

The old `@napplet/nap/ifc`, `@napplet/nap/ifc/types`, `@napplet/nap/ifc/shim`, and `@napplet/nap/ifc/sdk` subpaths remain as deprecated thin wrappers. They re-export the INC implementation and aliases only; they do not define a separate `ifc` domain or `ifc.*` wire protocol.

### Intent and INC conventions

NAP-INTENT routes to an archetype role. A handler advertises opaque
`conventions`, and a caller can pass one `convention` with its request; the shell
selects the handler. The convention name identifies a local payload choice, not a
payload schema supplied by this package.

NAP-INC topics use the same opaque-string boundary. Use the current advisory
open names such as `napplet:note/open`, `napplet:profile/open`, and
`napplet:dm/open` when they fit the receiving napplet's documented local choice.

### NAP-INC convention URI emission

This non-normative package guide follows [NAP-INC draft PR #89 at its exact
head](https://github.com/napplet/naps/blob/34ec29fc4039384a83dbd6b476f83c4fa0d038e6/naps/NAP-INC.md).
`emit(topic, payload?)` accepts a stable topic and optional opaque payload. It
also accepts a queried `napplet:<archetype>/<intent>` convention URI as
developer-facing shorthand:

```ts
import { emit, on } from '@napplet/nap/inc';

emit('napplet:profile/open?pubkey=abc123');
// -> { type: 'inc.emit', topic: 'napplet:profile/open', payload: { pubkey: 'abc123' } }

on('napplet:profile/open', (payload) => {
  console.log(payload);
});
```

The runtime preprocesses that query before routing: it percent-decodes shallow
text pairs (`+` remains a literal plus) and emits the queryless stable topic.
Fragments, malformed percent encoding, repeated decoded names, and a query with
an explicit payload throw synchronously before emission. Use a queryless topic
with the explicit payload argument for structured or non-text data.

This rule applies only to outbound NAP-INC `emit`. NAP-INTENT and manifest
conventions remain opaque, while subscriptions and shell delivery keep exact
complete-string routing with no query, wildcard, prefix, or canonicalization
matching.

## Subpath Patterns

Each domain exposes up to three patterns (four including the barrel). Pick the shape that matches what your code actually needs:

- **Barrel** (`@napplet/nap/<domain>`): re-exports types + shim installer + SDK helpers together. Most ergonomic for consumers that want everything a domain offers.
- **Types-only** (`@napplet/nap/<domain>/types`): pure TypeScript types, zero runtime code. Ideal for shells writing typed message handlers without shipping the shim installer.
- **Shim** (`@napplet/nap/<domain>/shim`): installer + message handlers. For shell/host code mounting a NAP into the napplet window.
- **SDK** (`@napplet/nap/<domain>/sdk`): named-function helpers (e.g., `relaySubscribe`, `storageGet`). For napplet consumer code that wants a typed wrapper over `window.napplet`.

## Tree-Shaking Contract

- `@napplet/nap` publishes with `sideEffects: false`
- Every subpath in the `exports` map is a discrete entry point; a bundler importing only `@napplet/nap/relay/types` produces zero bytes from unrelated domains
- Verified end-to-end in Phase 121 with a minimal-consumer smoke test

The `exports` map in `package.json` declares 92 entry points:

- 22 domain barrels (`@napplet/nap/<domain>`)
- 22 granular types entries (`@napplet/nap/<domain>/types`)
- 22 granular shim entries (`@napplet/nap/<domain>/shim`)
- 22 granular sdk entries (`@napplet/nap/<domain>/sdk`)
- 1 deprecated compatibility wrapper (`ifc`) with matching `types`, `shim`,
  and `sdk` entries

Each entry maps to its own pre-built `.js` + `.d.ts` pair under `dist/<domain>/<surface>.{js,d.ts}`. No root `.` key exists, and there is no top-level `main`/`module`/`types` field — attempting `import '@napplet/nap'` fails with `ERR_PACKAGE_PATH_NOT_EXPORTED` by design.

## Compatibility Subpaths

`ifc` is a deprecated compatibility wrapper for `inc`. It remains exported so
older consumers keep working, but new napplet capability checks should use the
active NAP domains.

## Resource NAP (v0.28.0)

The `resource` domain ships in v0.28.0 alongside the milestone of browser-enforced
resource isolation. It defines scheme-pluggable byte-fetching primitives:

```ts
import { info, bytes, bytesMany, bytesAsObjectURL } from '@napplet/nap/resource/sdk';

// Advisory schemes and coarse policy limits. Not required before fetching.
const resourceInfo = await info();

// Fetch any URL the shell accepts under its policy. URL space is scheme-pluggable.
const blob: Blob = await bytes('https://example.com/avatar.png');

// Fetch many URLs in one envelope. Items preserve input order and length.
const items = await bytesMany([
  'https://example.com/avatar.png',
  'blossom:sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
]);

// Synchronous handle for <img src> use; revoke when done.
const handle = bytesAsObjectURL('blossom:sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
imgEl.src = handle.url;
// later
handle.revoke();
```

Canonical schemes are defined in the spec:

- `data:` — RFC 2397, decoded inside the napplet shim with zero shell round-trip
- `https:` — shell-side network fetch under the default resource policy (private-IP block list at DNS time, MIME byte-sniffing, size cap, timeout, rate limit, redirect cap)
- `blossom:sha256:<hex>` — Blossom hash → bytes; shell verifies hash before delivery
- `htree:` — Hashtree reference; shell verifies every Hashtree hash before delivery
- `nostr:<bech32>` — single-hop NIP-19 resolution against the shell's relay pool

Errors arrive as one of 8 typed codes: `not-found`, `blocked-by-policy`, `timeout`,
`too-large`, `unsupported-scheme`, `decode-failed`, `network-error`, `quota-exceeded`.

See [NAP-RESOURCE](https://github.com/napplet/naps) for the normative spec, the
default shell resource policy, and the SVG rasterization MUSTs.

## Identity NAP

The `identity` domain is read-only. It exposes the shell-user pubkey and public
identity data, but it does not sign, encrypt, or decrypt. Startup code should
take one snapshot with `getPublicKey()` and then subscribe to shell-pushed
`identity.changed` updates instead of polling while a signer connects.

```ts
const pubkey = await window.napplet.identity.getPublicKey(); // "" when signed out

const sub = window.napplet.identity.onChanged((nextPubkey) => {
  if (nextPubkey === '') {
    // signed out or signer disconnected
    return;
  }
  // identity-dependent work can refresh here
});
```

The wire surface includes `identity.changed` as a shell-to-napplet push message
with `{ pubkey }` and no correlation `id`. The public key shape matches
`identity.getPublicKey.result`: a hex pubkey when connected, or `""` when no
user/signer is connected.

See the [NAP-IDENTITY](https://github.com/napplet/naps/pull/12) draft spec for
the current read-only contract.

## Package Surface

`@napplet/nap` is the compatibility package for every NAP domain. Import each domain through the package subpath:

```ts
import { mediaCreateSession } from '@napplet/nap/media/sdk';
import type { MediaNapMessage } from '@napplet/nap/media/types';
```

Domain barrels are also available at `@napplet/nap/relay`, `@napplet/nap/storage`, `@napplet/nap/inc`, `@napplet/nap/keys`, `@napplet/nap/theme`, `@napplet/nap/media`, `@napplet/nap/notify`, `@napplet/nap/identity`, `@napplet/nap/config`, `@napplet/nap/resource`, `@napplet/nap/cvm`, `@napplet/nap/outbox`, `@napplet/nap/upload`, `@napplet/nap/intent`, `@napplet/nap/ble`, `@napplet/nap/webrtc`, `@napplet/nap/link`, `@napplet/nap/count`, `@napplet/nap/lists`, `@napplet/nap/common`, `@napplet/nap/serial`, and `@napplet/nap/dm`.

## Optional Peer Dependency

`@napplet/nap` declares `json-schema-to-ts@^3.1.1` as an **optional** peer dependency (via `peerDependenciesMeta.json-schema-to-ts.optional: true`). Install it in your napplet if you want `FromSchema<typeof schema>` type inference for your `config.subscribe` callback — the `values` parameter is then inferred directly from your schema (enums, required fields, defaults all flow through). Authors who skip it pay no install cost and `config.subscribe` still works with the default `Record<string, unknown>` typing.

```ts
// With json-schema-to-ts installed — values is fully typed
import { configSubscribe } from '@napplet/nap/config/sdk';
import type { FromSchema } from 'json-schema-to-ts';

const schema = {
  type: 'object',
  properties: {
    relayUrl: { type: 'string', format: 'uri' },
    maxResults: { type: 'integer', minimum: 1, default: 20 },
  },
  required: ['relayUrl'],
} as const;

configSubscribe<FromSchema<typeof schema>>((values) => {
  // values.relayUrl: string
  // values.maxResults: number | undefined
});
```

## Protocol Reference

- [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303) — Napplet-shell protocol specification (JSON envelope + NAP negotiation)

## License

MIT

Repository: [github.com/sandwichfarm/napplet](https://github.com/sandwichfarm/napplet)
