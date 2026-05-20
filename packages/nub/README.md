# @napplet/nub

> All 12 napplet NUB domains (relay, storage, ifc, keys, theme, media, notify, identity, config, resource, connect, class) as layered subpath exports.

## Install

```bash
pnpm add @napplet/nub
```

`@napplet/nub` has no root export — consumers MUST import from a domain subpath. See [Subpath Patterns](#subpath-patterns) for the three available entry-point shapes per domain.

## Quick Start

```ts
// Barrel — types + shim installer + sdk helper together
import { installRelayShim, relaySubscribe, RelaySubscribeMessage } from '@napplet/nub/relay';
```

```ts
// Granular — types only (zero runtime cost)
import type { IfcEventMessage } from '@napplet/nub/ifc/types';
```

Shells that only need to mount a NUB import the shim subpath directly:

```ts
// Granular — shim installer only (no SDK helpers bundled)
import { installStorageShim } from '@napplet/nub/storage/shim';
```

Napplet authors that want a typed wrapper over `window.napplet` without the installer pull from the SDK subpath:

```ts
// Granular — SDK helpers only (no shim installer bundled)
import { notifySend } from '@napplet/nub/notify/sdk';
```

End-to-end: a napplet subscribes to a relay stream using the SDK helper, while the shell mounts the matching installer on the napplet window:

```ts
// In the napplet (runs inside the sandboxed iframe)
import { relaySubscribe } from '@napplet/nub/relay/sdk';

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
import { installRelayShim } from '@napplet/nub/relay/shim';

installRelayShim(nappletWindow, {
  // shell-provided relay pool, ACL, etc.
});
```

## 12 Domains

Each domain is an independent subpath. Barrel imports bundle types + shim installer + SDK helpers; granular subpaths isolate each surface.

| Domain | Barrel | Types | Shim | SDK | Purpose |
|--------|--------|-------|------|-----|---------|
| relay | `@napplet/nub/relay` | `@napplet/nub/relay/types` | `@napplet/nub/relay/shim` | `@napplet/nub/relay/sdk` | Nostr relay proxy (subscribe/publish/query) |
| storage | `@napplet/nub/storage` | `@napplet/nub/storage/types` | `@napplet/nub/storage/shim` | `@napplet/nub/storage/sdk` | Scoped key-value storage |
| ifc | `@napplet/nub/ifc` | `@napplet/nub/ifc/types` | `@napplet/nub/ifc/shim` | `@napplet/nub/ifc/sdk` | Inter-frame communication (topic pub/sub) |
| keys | `@napplet/nub/keys` | `@napplet/nub/keys/types` | `@napplet/nub/keys/shim` | `@napplet/nub/keys/sdk` | Keyboard bindings + action registration |
| theme | `@napplet/nub/theme` | `@napplet/nub/theme/types` | — | — | Read-only shell theme access (types-only today) |
| media | `@napplet/nub/media` | `@napplet/nub/media/types` | `@napplet/nub/media/shim` | `@napplet/nub/media/sdk` | Media sessions + playback |
| notify | `@napplet/nub/notify` | `@napplet/nub/notify/types` | `@napplet/nub/notify/shim` | `@napplet/nub/notify/sdk` | Shell-rendered notifications |
| identity | `@napplet/nub/identity` | `@napplet/nub/identity/types` | `@napplet/nub/identity/shim` | `@napplet/nub/identity/sdk` | Read-only user queries (pubkey, metadata) |
| config | `@napplet/nub/config` | `@napplet/nub/config/types` | `@napplet/nub/config/shim` | `@napplet/nub/config/sdk` | Declarative per-napplet config (schema-driven) |
| resource | `@napplet/nub/resource` | `@napplet/nub/resource/types` | `@napplet/nub/resource/shim` | `@napplet/nub/resource/sdk` | Sandboxed byte fetching (https/blossom/nostr/data) via `bytes(url) → Blob` |
| connect | `@napplet/nub/connect` | `@napplet/nub/connect/types` | `@napplet/nub/connect/shim` | `@napplet/nub/connect/sdk` | User-gated direct network access (state-only; no wire — grants flow via CSP + discovery meta tag) |
| class | `@napplet/nub/class` | `@napplet/nub/class/types` | `@napplet/nub/class/shim` | `@napplet/nub/class/sdk` | Shell-assigned integer class via `class.assigned` wire envelope; exposes `window.napplet.class` |

## Subpath Patterns

Each domain exposes up to three patterns (four including the barrel). Pick the shape that matches what your code actually needs:

- **Barrel** (`@napplet/nub/<domain>`): re-exports types + shim installer + SDK helpers together. Most ergonomic for consumers that want everything a domain offers.
- **Types-only** (`@napplet/nub/<domain>/types`): pure TypeScript types, zero runtime code. Ideal for shells writing typed message handlers without shipping the shim installer.
- **Shim** (`@napplet/nub/<domain>/shim`): installer + message handlers. For shell/host code mounting a NUB into the napplet window.
- **SDK** (`@napplet/nub/<domain>/sdk`): named-function helpers (e.g., `relaySubscribe`, `storageGet`). For napplet consumer code that wants a typed wrapper over `window.napplet`.

## Tree-Shaking Contract

- `@napplet/nub` publishes with `sideEffects: false`
- Every subpath in the `exports` map is a discrete entry point; a bundler importing only `@napplet/nub/relay/types` produces zero bytes from the other 8 domains
- Verified end-to-end in Phase 121 with a minimal-consumer smoke test

The `exports` map in `package.json` declares 46 entry points:

- 12 domain barrels (`@napplet/nub/<domain>`)
- 12 granular types entries (`@napplet/nub/<domain>/types`)
- 11 granular shim entries (theme omitted — see [Theme Exception](#theme-exception))
- 11 granular sdk entries (theme omitted — see [Theme Exception](#theme-exception))

Each entry maps to its own pre-built `.js` + `.d.ts` pair under `dist/<domain>/<surface>.{js,d.ts}`. No root `.` key exists, and there is no top-level `main`/`module`/`types` field — attempting `import '@napplet/nub'` fails with `ERR_PACKAGE_PATH_NOT_EXPORTED` by design.

## Theme Exception

Theme is types-only today — only `@napplet/nub/theme` (barrel, re-exports `./types`) and `@napplet/nub/theme/types` exist. There is no `@napplet/nub/theme/shim` or `@napplet/nub/theme/sdk` entry in the exports map. Shell-side theme handling stays in the host shell; this may change in a future milestone if a theme shim/sdk surface is added upstream.

## Resource NUB (v0.28.0)

The `resource` domain ships in v0.28.0 alongside the milestone of browser-enforced
resource isolation. It defines a single scheme-pluggable byte-fetching primitive:

```ts
import { bytes, bytesAsObjectURL } from '@napplet/nub/resource/sdk';

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

See [NUB-RESOURCE](https://github.com/napplet/nubs) for the normative spec, the
default shell resource policy, and the SVG rasterization MUSTs.

## Identity NUB (v0.29.0)

The `identity` domain gains a class-gated receive-side decrypt primitive in v0.29.0 —
`identity.decrypt(event)` — closing the NIP-17 / NIP-59 gift-wrap gap. The shell
owns NIP-04 / direct NIP-44 / NIP-17 gift-wrap unwrap logic; napplets receive a
validated `{ rumor, sender }` shape where `sender` is shell-authenticated from the
seal signature (not napplet-derived from `rumor.pubkey`).

```ts
import '@napplet/shim';
import type { Rumor } from '@napplet/nub/identity';

// Given an incoming NIP-17 kind-1059 gift-wrap, NIP-44 ciphertext, or NIP-04 event:
const { rumor, sender } = await window.napplet.identity.decrypt(giftWrapEvent);

// `rumor` is UnsignedEvent & { id: string } — nostr-tools canonical type, no sig field
// `sender` is the shell-authenticated pubkey from the seal signature
console.log(`${sender} says: ${rumor.content}`);
```

**Shape auto-detection.** The shell accepts NIP-04 (kind-4 content), direct NIP-44
(kind-44 or other with NIP-44 payload shape), and NIP-17 / NIP-59 gift-wrap (kind-1059
→ kind-13 seal → rumor). Napplets do NOT select the encryption mode — a single entry
point serves all three.

**Class gating (shell-enforced).** `identity.decrypt` is legal only for napplets
assigned `class: 1` per `NUB-CLASS-1.md` (strict baseline posture: `connect-src 'none'`,
zero direct network egress, so plaintext is trapped in the frame). Napplets of other
classes — including undefined-class napplets and NUB-CLASS-2 napplets with approved
direct-origin access — are refused at the shell boundary with a `class-forbidden`
error. Enforcement runs shell-side; shim-side class observability is defense-in-depth
only, never the trust boundary.

**Errors** (typed `IdentityDecryptErrorCode` discriminator, 8 values):

| Code | Meaning |
|------|---------|
| `class-forbidden` | Calling napplet is not assigned class: 1 per NUB-CLASS-1 |
| `signer-denied` | User declined the decrypt operation at the shell prompt |
| `signer-unavailable` | Shell signer is not available (no signed-in identity) |
| `decrypt-failed` | Cryptographic decrypt failed (wrong key, corrupted payload) |
| `malformed-wrap` | Outer wrap signature failed validation or payload shape is invalid |
| `impersonation` | NIP-17 seal.pubkey !== rumor.pubkey (spec MUST per NUB-IDENTITY) |
| `unsupported-encryption` | Event's encryption shape is not NIP-04 / NIP-44 / NIP-17 |
| `policy-denied` | Shell policy rejects this napplet's subsequent decrypt requests |

Napplets MUST NOT attempt to call `window.nostr.*` for decrypt — even if a NIP-07
browser extension injects `window.nostr` into the iframe (see NIP-5D §Security
Considerations), that path is architecturally forbidden and the shell enforces the
ban at the `identity.decrypt` boundary.

See the [NUB-IDENTITY](https://github.com/napplet/nubs) draft spec on `napplet/nubs`
for the full envelope + conformance table + shell MUSTs.

## Connect + Class NUBs (v0.29.0)

v0.29.0 adds two subpaths that work together to express user-gated direct network access and shell-assigned security class.

### `@napplet/nub/connect`

State-only NUB — NO postMessage wire. Grants flow through the runtime CSP the shell serves with the napplet HTML, plus a shell-injected `<meta name="napplet-connect-granted" content="<space-separated-origins>">` tag read synchronously by the napplet shim at install time.

```ts
import type { NappletConnect } from '@napplet/nub/connect/types';
import { installConnectShim, normalizeConnectOrigin } from '@napplet/nub/connect';

// Napplet-side (runs inside the sandboxed iframe)
// The shim populates window.napplet.connect synchronously at install time.
if (window.napplet.connect.granted) {
  const res = await fetch(`${window.napplet.connect.origins[0]}/items`, { method: 'POST', body: '{}' });
}

// Build-side / shell-side (shared origin validator; throws on invalid input)
const o = normalizeConnectOrigin('https://api.example.com');   // 'https://api.example.com'
```

`NappletConnect` is `{ readonly granted: boolean; readonly origins: readonly string[] }`. Default on shells that do not implement `nub:connect`, on denied prompts, or pre-injection: `{ granted: false, origins: [] }` (never `undefined`).

### `@napplet/nub/class`

Wire-driven NUB with a single shell → napplet envelope `class.assigned` (`{ type: 'class.assigned'; id: string; class: number }`). Sent at iframe-ready time, exactly once per napplet lifecycle. The napplet shim writes the received integer to `window.napplet.class` via a `defineProperty` getter.

```ts
import type { ClassAssignedMessage, NappletClass } from '@napplet/nub/class/types';
import { installClassShim, getClass } from '@napplet/nub/class';

// Napplet-side (runs inside the sandboxed iframe)
// installClassShim() registers the class.assigned dispatcher handler via registerNub.
// Before the envelope arrives, or if the shell does not implement nub:class:
// window.napplet.class === undefined (never 0, never null).
if (window.napplet.shell.supports('nub:class') && getClass() === 2) {
  // NUB-CLASS-2 posture — user approved direct network access.
}
```

The class integer is an identifier into the `NUB-CLASS-$N` sub-track (1 = strict baseline, 2 = user-approved explicit-origin). See the NUB-CLASS specs at `napplet/nubs` for posture semantics.

See [NUB-CONNECT](https://github.com/napplet/nubs) and [NUB-CLASS](https://github.com/napplet/nubs) for the normative specs, the canonical `connect:origins` aggregateHash fold, the origin format rules, the consent-flow MUSTs, and the at-most-one-terminal-envelope-per-lifecycle constraint.

## Package Surface

`@napplet/nub` is the canonical package for every NUB domain. Import each domain through the package subpath:

```ts
import { mediaCreateSession } from '@napplet/nub/media/sdk';
import type { MediaNubMessage } from '@napplet/nub/media/types';
```

Domain barrels are also available at `@napplet/nub/relay`, `@napplet/nub/storage`, `@napplet/nub/ifc`, `@napplet/nub/keys`, `@napplet/nub/theme`, `@napplet/nub/media`, `@napplet/nub/notify`, `@napplet/nub/identity`, `@napplet/nub/config`, `@napplet/nub/resource`, `@napplet/nub/connect`, and `@napplet/nub/class`.

## Optional Peer Dependency

`@napplet/nub` declares `json-schema-to-ts@^3.1.1` as an **optional** peer dependency (via `peerDependenciesMeta.json-schema-to-ts.optional: true`). Install it in your napplet if you want `FromSchema<typeof schema>` type inference for your `config.subscribe` callback — the `values` parameter is then inferred directly from your schema (enums, required fields, defaults all flow through). Authors who skip it pay no install cost and `config.subscribe` still works with the default `Record<string, unknown>` typing.

```ts
// With json-schema-to-ts installed — values is fully typed
import { configSubscribe } from '@napplet/nub/config/sdk';
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

- [NIP-5D](../../specs/NIP-5D.md) — Napplet-shell protocol specification (JSON envelope + NUB negotiation)

## License

MIT

Repository: [github.com/sandwichfarm/napplet](https://github.com/sandwichfarm/napplet)
