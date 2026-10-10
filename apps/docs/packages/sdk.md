# @napplet/sdk

> Named TypeScript exports for napplet developers using a bundler. Wraps
> `window.napplet` at call time.

`@napplet/sdk` gives napplet code typed, named imports that delegate to injected `window.napplet.*` counterparts. It depends on [`@napplet/core`](./core) for types only and has **no side effects**. If a method is called before the runtime injected `window.napplet`, or before that domain is available, the SDK throws a clear error.

- **npm:** [`@napplet/sdk`](https://www.npmjs.com/package/@napplet/sdk)
- **JSR:** [`@napplet/sdk`](https://jsr.io/@napplet/sdk)
- **Source:** [packages/sdk](https://github.com/napplet/napplet/tree/main/packages/sdk)

## Install

```bash
npm install @napplet/sdk
```

## Key exports

Top-level namespaced objects that mirror `window.napplet`:

- **`outbox`** — `getEvent`, `query`, `subscribe`, `publish`, `resolveRelays`
- **`common`** — profile lookup, follow/unfollow, reactions, reports, NIP-19 helpers
- **`lists`** — NIP-51 list read and mutation helpers
- **`count`** — count queries through the shell
- **`dm`** — shell-mediated encrypted direct-message helpers
- **`relay`** — low-level explicit relay proxy; use only for relay-local escape hatches
- **`inc`** — `emit`, `on` (plus deprecated `ifc*` migration aliases)
- **`intent`** — `invoke`, `open`, `available`, `handlers`, `onChanged`
- **`storage`** — `getItem`, `setItem`, `removeItem`, `keys`, plus `storage.instance.*` (per-instance scope)
- **`keys`** — `registerAction`, `unregisterAction`, `onAction`
- **`media`** — `createSession`, `reportState`, `onCommand`, …
- **`notify`** — `send`, `badge`, `onAction`, …
- **`config`** — `get`, `subscribe`, `openSettings`, `registerSchema`, `schema`
- **`resource`** — `info`, `bytes`, `bytesMany`, `bytesAsObjectURL`

`identity` is exported as a top-level object and through bare-name helpers:

- `identityGetPublicKey`, `identityOnChanged`

There is no top-level `shell` object. Detect capability availability from runtime-injected domain presence (`window.napplet?.outbox`, `window.napplet?.dm`, and so on).

The SDK also re-exports:

- the `*_DOMAIN` constants and `install*Shim` installers
- `resourceInfo`, `resourceBytes`, `resourceBytesMany`, `resourceBytesAsObjectURL`

It also re-exports the protocol types from `@napplet/core` and the per-domain message-type unions (`RelayNapMessage`, `IdentityNapMessage`, …) and `*_DOMAIN` constants from the NAP packages.

## Usage

```ts
import { outbox, common, inc, intent, storage, keys, config, resource } from '@napplet/sdk';

// Read kind 1 notes through outbox-aware routing const { events } = await outbox.query(   [{ kinds: [1], limit: 20 }],   { timeoutMs: 3000 }, ); for (const result of events) console.log('Note:', result.event.content);

// Subscribe to live updates through the same outbox boundary const sub = outbox.subscribe([{ kinds: [1], limit: 20 }], { timeoutMs: 3000 }); sub.on('event', (result) => console.log('New note:', result.event.content));

// Publish a signed note through the user's outbox/write relays const published = await outbox.publish({   kind: 1,   content: 'Hello from my napplet!',   tags: [],   created_at: Math.floor(Date.now() / 1000), }); if (!published.ok || !published.event) throw new Error(published.error ?? 'publish failed');

// Common social actions keep consent, event construction, signing, and relay routing in the shell await common.react(published.event.id, '+');

// Inter-napplet messaging: payload is a local convention choice. inc.emit('chat:message', { text: 'hi' });

const intentResult = await intent.open('napplet:profile/open', { payload: { pubkey: 'abc123' }, behavior: { reuse: false } }); if (!intentResult.ok) throw new Error(intentResult.error);

// Scoped storage await storage.setItem('theme', 'dark');

// Live per-napplet config const configSub = config.subscribe((values) => applyTheme(values.theme));

// Fetch external bytes through the shell
const avatarBlob = await resource.bytes('blossom:sha256:abc123...', {
  servers: ['https://cdn.hzrd149.com'],
});
const avatarItems = await resource.bytesMany([
  { url: 'https://example.com/avatar.png' },
  { url: 'blossom:sha256:abc123...', servers: ['https://cdn.hzrd149.com'] },
]);
```

### INC convention URIs

`inc.emit(topic, payload?)` accepts a queried convention URI at the INC developer boundary. The binding transposes a call such as `inc.emit('napplet:profile/open?pubkey=abc123')` into the queryless stable topic `napplet:profile/open` plus a shallow decoded text payload. `pubkey` is a local convention choice; receiving code owns payload validation.

Subscribe using the stable topic, not the queried developer-facing URI:

```ts
inc.emit('napplet:profile/open?pubkey=abc123');
const profileOpen = inc.on('napplet:profile/open', (event) => {
  validateProfileOpenPayload(event.payload);
});
```

Routing remains exact after transposition, with no query-aware, prefix, or wildcard matching. Fragments, malformed percent encoding, repeated decoded names, and a query combined with an explicit payload reject before emission. Manifest convention values and normalized wire identities stay queryless.

### Intent dispatch

Use `intent.invoke(uri, options?)` or `intent.open(uri, options?)`.

```ts
const result = await intent.open('napplet:profile/open', { payload: { pubkey: 'abc123' }, behavior: { reuse: false } });
if (!result.ok) throw new Error(result.error);
```

Intent calls derive archetype and action from the URI. An `ok: true` result means the runtime accepted delivery responsibility and includes the normalized identity and handler catalog identifier; an `ok: false` result includes `error`. Targets receive runtime-attested `IntentDelivery` values through `onDelivery`, including deliveries retained before registration. Behavior hints are `focus` and `reuse`. This non-normative guidance defers to the living [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md).

These APIs defer to the living [NAP-INC](https://github.com/napplet/naps/blob/master/naps/NAP-INC.md) and [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md) documents.

### Typed config with `FromSchema`

`json-schema-to-ts` is an **optional** peer dependency. Install it to get `FromSchema<typeof schema>` typing flowing into your `config.subscribe` callback; skip it and `config.subscribe` still works with the default `Record<string, unknown>` typing.

```ts
import { config } from '@napplet/sdk';
import type { FromSchema } from 'json-schema-to-ts';

const schema = {   type: 'object',   properties: { theme: { type: 'string', enum: ['light', 'dark'], default: 'dark' } },   required: ['theme'], } as const;

const sub = config.subscribe((values: FromSchema<typeof schema>) => {
  // values.theme is typed 'light' | 'dark'
});
```

## Namespace import

`import * as napplet from '@napplet/sdk'` produces an object structurally identical to `window.napplet`:

```ts
import * as napplet from '@napplet/sdk';
const { events } = await napplet.outbox.query([{ kinds: [1], limit: 20 }]);
```

## See also

- [Runtime injection vs. SDK](/guide/getting-started#runtime-injection-vs-sdk)
- [`@napplet/shim`](./shim) — runtime-side injected global installer


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
Theme updates reach napplets with the exposed `theme` domain, independently of manifest requirement declarations. User identity changes report the connected signer, including an empty string at sign-out; they do not alter napplet identity. Profile picture/banner bytes use optional `resource` when exposed; otherwise show local placeholder artwork. Theme media URLs do not grant network access, so colors and local fonts provide the fallback. See [NAP-THEME](https://github.com/napplet/naps/blob/master/naps/NAP-THEME.md) and [NAP-IDENTITY](https://github.com/napplet/naps/blob/master/naps/NAP-IDENTITY.md).
