# @napplet/nap

> All 16 napplet NAP domains (relay, storage, inc, keys, theme, media, notify, identity, config, resource, connect, class, cvm, outbox, upload, intent) as layered subpath exports. The package name remains `@napplet/nap` for compatibility.

## Install

```bash
pnpm add @napplet/nap
```

`@napplet/nap` has no root export — consumers MUST import from a domain subpath. See [Subpath Patterns](#subpath-patterns) for the three available entry-point shapes per domain.

## Quick Start

```ts
// Barrel — types + shim installer + sdk helper together
import { installRelayShim, relaySubscribe, RelaySubscribeMessage } from '@napplet/nap/relay';
```

```ts
// Granular — types only (zero runtime cost)
import type { IncEventMessage } from '@napplet/nap/inc/types';
```

Shells that only need to mount a NAP import the shim subpath directly:

```ts
// Granular — shim installer only (no SDK helpers bundled)
import { installStorageShim } from '@napplet/nap/storage/shim';
```

Napplet authors that want a typed wrapper over `window.napplet` without the installer pull from the SDK subpath:

```ts
// Granular — SDK helpers only (no shim installer bundled)
import { notifySend } from '@napplet/nap/notify/sdk';
```

End-to-end: a napplet subscribes to a relay stream using the SDK helper, while the shell mounts the matching installer on the napplet window:

```ts
// In the napplet (runs inside the sandboxed iframe)
import { relaySubscribe } from '@napplet/nap/relay/sdk';

const sub = relaySubscribe(
  [{ kinds: [1], limit: 20 }],
  {
    onEvent: (event) => console.log('note', event),
    onEose: () => console.log('caught up'),
  },
);

// Later, tear down the subscription
sub.close();
```

```ts
// In the shell (runs on the host page)
import { installRelayShim } from '@napplet/nap/relay/shim';

installRelayShim(nappletWindow, {
  // shell-provided relay pool, ACL, etc.
});
```

## 16 Domains

Each domain is an independent subpath. Barrel imports bundle types + shim installer + SDK helpers; granular subpaths isolate each surface.

| Domain | Barrel | Types | Shim | SDK | Purpose |
|--------|--------|-------|------|-----|---------|
| relay | `@napplet/nap/relay` | `@napplet/nap/relay/types` | `@napplet/nap/relay/shim` | `@napplet/nap/relay/sdk` | Nostr relay proxy (subscribe/publish/query) |
| storage | `@napplet/nap/storage` | `@napplet/nap/storage/types` | `@napplet/nap/storage/shim` | `@napplet/nap/storage/sdk` | Scoped key-value storage |
| inc | `@napplet/nap/inc` | `@napplet/nap/inc/types` | `@napplet/nap/inc/shim` | `@napplet/nap/inc/sdk` | Inter-napplet communication (topic pub/sub) |
| keys | `@napplet/nap/keys` | `@napplet/nap/keys/types` | `@napplet/nap/keys/shim` | `@napplet/nap/keys/sdk` | Keyboard bindings + action registration |
| theme | `@napplet/nap/theme` | `@napplet/nap/theme/types` | — | — | Read-only shell theme access (types-only today) |
| media | `@napplet/nap/media` | `@napplet/nap/media/types` | `@napplet/nap/media/shim` | `@napplet/nap/media/sdk` | Ownership-aware media sessions + playback |
| notify | `@napplet/nap/notify` | `@napplet/nap/notify/types` | `@napplet/nap/notify/shim` | `@napplet/nap/notify/sdk` | Shell-rendered notifications |
| identity | `@napplet/nap/identity` | `@napplet/nap/identity/types` | `@napplet/nap/identity/shim` | `@napplet/nap/identity/sdk` | Read-only user queries (pubkey, metadata) |
| config | `@napplet/nap/config` | `@napplet/nap/config/types` | `@napplet/nap/config/shim` | `@napplet/nap/config/sdk` | Declarative per-napplet config (schema-driven) |
| resource | `@napplet/nap/resource` | `@napplet/nap/resource/types` | `@napplet/nap/resource/shim` | `@napplet/nap/resource/sdk` | Sandboxed byte fetching (https/blossom/nostr/data) via `bytes(url) → Blob` |
| connect | `@napplet/nap/connect` | `@napplet/nap/connect/types` | `@napplet/nap/connect/shim` | `@napplet/nap/connect/sdk` | User-gated direct network access (state-only; no wire — grants flow via CSP + discovery meta tag) |
| class | `@napplet/nap/class` | `@napplet/nap/class/types` | `@napplet/nap/class/shim` | `@napplet/nap/class/sdk` | Shell-assigned integer class via `class.assigned` wire envelope; exposes `window.napplet.class` |
| cvm | `@napplet/nap/cvm` | `@napplet/nap/cvm/types` | `@napplet/nap/cvm/shim` | `@napplet/nap/cvm/sdk` | Native ContextVM bridge — MCP-over-Nostr (`discover`/`listTools`/`callTool`/`listResources`/`readResource`); shell owns all transport |
| outbox | `@napplet/nap/outbox` | `@napplet/nap/outbox/types` | `@napplet/nap/outbox/shim` | `@napplet/nap/outbox/sdk` | Outbox-aware relay routing — `query`/`subscribe`/`publish`/`resolveRelays`; shell owns NIP-65 relay discovery, dedup, and fanout |
| upload | `@napplet/nap/upload` | `@napplet/nap/upload/types` | `@napplet/nap/upload/shim` | `@napplet/nap/upload/sdk` | Shell-mediated file/blob upload — `upload`/`status`/`onStatus` over NIP-96 + Blossom rails; shell signs auth, returns NIP-94 metadata |
| intent | `@napplet/nap/intent` | `@napplet/nap/intent/types` | `@napplet/nap/intent/shim` | `@napplet/nap/intent/sdk` | Archetype intent dispatch — `invoke`/`open`/`available`/`handlers`/`onChanged`; invoke another napplet by role, shell resolves the default handler |

### Deprecated IFC Compatibility

NAP-IFC was renamed to NAP-INC because the surface is inter-napplet communication, not generic inter-frame communication. New code must use `@napplet/nap/inc`, `window.napplet.inc`, the `inc.*` wire messages, and the `Inc*` TypeScript names.

The old `@napplet/nap/ifc`, `@napplet/nap/ifc/types`, `@napplet/nap/ifc/shim`, and `@napplet/nap/ifc/sdk` subpaths remain as deprecated thin wrappers. They re-export the INC implementation and aliases only; they do not define a separate `ifc` domain or `ifc.*` wire protocol.

## Subpath Patterns

Each domain exposes up to three patterns (four including the barrel). Pick the shape that matches what your code actually needs:

- **Barrel** (`@napplet/nap/<domain>`): re-exports types + shim installer + SDK helpers together. Most ergonomic for consumers that want everything a domain offers.
- **Types-only** (`@napplet/nap/<domain>/types`): pure TypeScript types, zero runtime code. Ideal for shells writing typed message handlers without shipping the shim installer.
- **Shim** (`@napplet/nap/<domain>/shim`): installer + message handlers. For shell/host code mounting a NAP into the napplet window.
- **SDK** (`@napplet/nap/<domain>/sdk`): named-function helpers (e.g., `relaySubscribe`, `storageGet`). For napplet consumer code that wants a typed wrapper over `window.napplet`.

## Tree-Shaking Contract

- `@napplet/nap` publishes with `sideEffects: false`
- Every subpath in the `exports` map is a discrete entry point; a bundler importing only `@napplet/nap/relay/types` produces zero bytes from the other 8 domains
- Verified end-to-end in Phase 121 with a minimal-consumer smoke test

The `exports` map in `package.json` declares 62 entry points:

- 16 domain barrels (`@napplet/nap/<domain>`)
- 16 granular types entries (`@napplet/nap/<domain>/types`)
- 15 granular shim entries (theme omitted — see [Theme Exception](#theme-exception))
- 15 granular sdk entries (theme omitted — see [Theme Exception](#theme-exception))

Each entry maps to its own pre-built `.js` + `.d.ts` pair under `dist/<domain>/<surface>.{js,d.ts}`. No root `.` key exists, and there is no top-level `main`/`module`/`types` field — attempting `import '@napplet/nap'` fails with `ERR_PACKAGE_PATH_NOT_EXPORTED` by design.

## Theme Exception

Theme is types-only today — only `@napplet/nap/theme` (barrel, re-exports `./types`) and `@napplet/nap/theme/types` exist. There is no `@napplet/nap/theme/shim` or `@napplet/nap/theme/sdk` entry in the exports map. Shell-side theme handling stays in the host shell; this may change in a future milestone if a theme shim/sdk surface is added upstream.

## Resource NAP (v0.28.0)

The `resource` domain ships in v0.28.0 alongside the milestone of browser-enforced
resource isolation. It defines a single scheme-pluggable byte-fetching primitive:

```ts
import { bytes, bytesAsObjectURL } from '@napplet/nap/resource/sdk';

// Fetch any URL the shell accepts under its policy. URL space is scheme-pluggable.
const blob: Blob = await bytes('https://example.com/avatar.png');

// Synchronous handle for <img src> use; revoke when done.
const handle = bytesAsObjectURL('blossom:sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
imgEl.src = handle.url;
// later
handle.revoke();
```

Four canonical schemes are defined in the spec:

- `data:` — RFC 2397, decoded inside the napplet shim with zero shell round-trip
- `https:` — shell-side network fetch under the default resource policy (private-IP block list at DNS time, MIME byte-sniffing, size cap, timeout, rate limit, redirect cap)
- `blossom:sha256:<hex>` — Blossom hash → bytes; shell verifies hash before delivery
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
import '@napplet/shim';

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

## Connect + Class NAPs (v0.29.0)

v0.29.0 adds two subpaths that work together to express user-gated direct network access and shell-assigned security class.

### `@napplet/nap/connect`

State-only NAP — NO postMessage wire. Grants flow through the runtime CSP the shell serves with the napplet HTML, plus a shell-injected `<meta name="napplet-connect-granted" content="<space-separated-origins>">` tag read synchronously by the napplet shim at install time.

```ts
import type { NappletConnect } from '@napplet/nap/connect/types';
import { installConnectShim, normalizeConnectOrigin } from '@napplet/nap/connect';

// Napplet-side (runs inside the sandboxed iframe)
// The shim populates window.napplet.connect synchronously at install time.
if (window.napplet.connect.granted) {
  const res = await fetch(`${window.napplet.connect.origins[0]}/items`, { method: 'POST', body: '{}' });
}

// Build-side / shell-side (shared origin validator; throws on invalid input)
const o = normalizeConnectOrigin('https://api.example.com');   // 'https://api.example.com'
```

`NappletConnect` is `{ readonly granted: boolean; readonly origins: readonly string[] }`. Default on shells that do not implement `nap:connect`, on denied prompts, or pre-injection: `{ granted: false, origins: [] }` (never `undefined`).

### `@napplet/nap/class`

Wire-driven NAP with a single shell -> napplet envelope `class.assigned` (`{ type: 'class.assigned'; id: string; class: number }`). Sent at iframe-ready time, exactly once per napplet lifecycle. The napplet shim writes the received integer to `window.napplet.class` via a `defineProperty` getter.

```ts
import type { ClassAssignedMessage, NappletClass } from '@napplet/nap/class/types';
import { installClassShim, getClass } from '@napplet/nap/class';

// Napplet-side (runs inside the sandboxed iframe)
// installClassShim() registers the class.assigned dispatcher handler via registerNap.
// Before the envelope arrives, or if the shell does not implement nap:class:
// window.napplet.class === undefined (never 0, never null).
if (window.napplet.shell.supports('nap:class') && getClass() === 2) {
  // NAP-CLASS-2 posture -- user approved direct network access.
}
```

The class integer is an identifier into the `NAP-CLASS-$N` sub-track (1 = strict baseline, 2 = user-approved explicit-origin). See the NAP-CLASS specs at `napplet/naps` for posture semantics.

See [NAP-CONNECT](https://github.com/napplet/naps) and [NAP-CLASS](https://github.com/napplet/naps) for the normative specs, the canonical `connect:origins` aggregateHash fold, the origin format rules, the consent-flow MUSTs, and the at-most-one-terminal-envelope-per-lifecycle constraint.

## Package Surface

`@napplet/nap` is the compatibility package for every NAP domain. Import each domain through the package subpath:

```ts
import { mediaCreateSession } from '@napplet/nap/media/sdk';
import type { MediaNapMessage } from '@napplet/nap/media/types';
```

Domain barrels are also available at `@napplet/nap/relay`, `@napplet/nap/storage`, `@napplet/nap/inc`, `@napplet/nap/keys`, `@napplet/nap/theme`, `@napplet/nap/media`, `@napplet/nap/notify`, `@napplet/nap/identity`, `@napplet/nap/config`, `@napplet/nap/resource`, `@napplet/nap/connect`, and `@napplet/nap/class`.

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

- [NIP-5D](../../specs/NIP-5D.md) — Napplet-shell protocol specification (JSON envelope + NAP negotiation)

## License

MIT

Repository: [github.com/sandwichfarm/napplet](https://github.com/sandwichfarm/napplet)
