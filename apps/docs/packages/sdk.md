# @napplet/sdk

> Named TypeScript exports for napplet developers using a bundler. Wraps
> `window.napplet` at call time.

`@napplet/sdk` gives napplet code typed, named imports that delegate to injected
`window.napplet.*` counterparts. It depends on [`@napplet/core`](./core) for
types only and has **no side effects**. If a method is called before the runtime
injected `window.napplet`, or before that domain is available, the SDK throws a
clear error.

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
- **`intent`** — `invoke`, `open`, `available`, `handlers`, `onChanged`,
  `onDelivery`
- **`storage`** — `getItem`, `setItem`, `removeItem`, `keys`, plus `storage.instance.*` (per-instance scope)
- **`keys`** — `registerAction`, `unregisterAction`, `onAction`
- **`media`** — `createSession`, `reportState`, `onCommand`, …
- **`notify`** — `send`, `badge`, `onAction`, …
- **`config`** — `get`, `subscribe`, `openSettings`, `registerSchema`, `schema`
- **`resource`** — `info`, `bytes`, `bytesMany`, `bytesAsObjectURL`

`identity` is exported as a top-level object and through bare-name helpers:

- `identityGetPublicKey`, `identityOnChanged`

There is no top-level `shell` object. Detect capability availability from
runtime-injected domain presence (`window.napplet?.outbox`, `window.napplet?.dm`,
and so on).

The SDK also re-exports:

- the `*_DOMAIN` constants and `install*Shim` installers
- `resourceInfo`, `resourceBytes`, `resourceBytesMany`, `resourceBytesAsObjectURL`

It also re-exports the protocol types from `@napplet/core` and the per-domain
message-type unions (`RelayNapMessage`, `IdentityNapMessage`, …) and `*_DOMAIN`
constants from the NAP packages.

## Usage

```ts
import { outbox, common, inc, intent, storage, keys, config, resource } from '@napplet/sdk';

// Read kind 1 notes through outbox-aware routing
const { events } = await outbox.query(
  [{ kinds: [1], limit: 20 }],
  { timeoutMs: 3000 },
);
for (const result of events) console.log('Note:', result.event.content);

// Subscribe to live updates through the same outbox boundary
const sub = outbox.subscribe([{ kinds: [1], limit: 20 }], { timeoutMs: 3000 });
sub.on('event', (result) => console.log('New note:', result.event.content));

// Publish a signed note through the user's outbox/write relays
const published = await outbox.publish({
  kind: 1,
  content: 'Hello from my napplet!',
  tags: [],
  created_at: Math.floor(Date.now() / 1000),
});
if (!published.ok || !published.event) throw new Error(published.error ?? 'publish failed');

// Common social actions keep consent, event construction, signing, and relay routing in the shell
await common.react(published.event.id, '+');

// Inter-napplet messaging: payload is a local convention choice.
inc.emit('chat:message', { text: 'hi' });

// Register this during target startup; delivery is separate from acceptance.
const intentDeliveries = intent.onDelivery((delivery) => {
  // The runtime attests sender, but receiving code still validates payload.
  validateIntentPayload(delivery.convention, delivery.payload);
});
const intentResult = await intent.open('napplet:profile/open?pubkey=abc123');
if (!intentResult.ok) throw new Error(intentResult.error);

// Scoped storage
await storage.setItem('theme', 'dark');

// Live per-napplet config
const configSub = config.subscribe((values) => applyTheme(values.theme));

// Fetch external bytes through the shell
const avatarBlob = await resource.bytes('https://example.com/avatar.png');
const avatarItems = await resource.bytesMany([
  'https://example.com/avatar.png',
  'blossom:sha256:abc123...',
]);
```

### INC convention URIs

`inc.emit(topic, payload?)` accepts a queried convention URI at the INC
developer boundary. The binding transposes a call such as
`inc.emit('napplet:profile/open?pubkey=abc123')` into the queryless stable topic
`napplet:profile/open` plus a shallow decoded text payload. `pubkey` is a local
convention choice; receiving code owns payload validation.

Subscribe using the stable topic, not the queried developer-facing URI:

```ts
inc.emit('napplet:profile/open?pubkey=abc123');
const profileOpen = inc.on('napplet:profile/open', (payload) => {
  validateProfileOpenPayload(payload);
});
```

Routing remains exact after transposition, with no query-aware, prefix, or
wildcard matching. Fragments, malformed percent encoding, repeated decoded
names, and a query combined with an explicit payload reject before emission.
Manifest convention values and normalized wire identities stay queryless.

### Intent URI and target delivery

`intent.invoke(uri, options?)` and `intent.open(uri, options?)` are the separate
NAP-INTENT URI boundary. The binding derives the normalized identity and turns
unique decoded query pairs into text payload fields. Use an explicit
`options.payload` only with a queryless URI.

```ts
const deliveries = intent.onDelivery((delivery) => {
  console.log(delivery.sender, delivery.archetype, delivery.action);
  validateIntentPayload(delivery.convention, delivery.payload);
});

const result = await intent.invoke('napplet:profile/open?pubkey=abc123');
if (result.ok) {
  // Accepted for delivery; the target may not have received it yet.
  console.log(result.handler);
}
```

The emitter cannot supply `delivery.sender`; the runtime derives it from the
authenticated source endpoint. Delivery is carrier-neutral, has no public
intent/delivery ID, survives the source lifetime, and has no public NAP-INC
dependency. Register `onDelivery` during target startup. The host owns
start/reuse/overlap/close, retry, persistence, and terminal-failure policy.

Discovery exposes one queryless `IntentContract` per manifest tag, with optional
same-tag `eventKinds`; receivers must not infer kinds from payload content.

These APIs follow [NAP-INC PR #89
(`4593ce9`)](https://github.com/napplet/naps/pull/89/commits/4593ce9e301ce098fd3dad64206fcd6f144fa7af),
[the web projection PR #90
(`896c32c`)](https://github.com/napplet/naps/pull/90/commits/896c32c92deee68dc4d10fc1132b62df20cccb6f),
and [NAP-INTENT PR #91
(`a718915`)](https://github.com/napplet/naps/pull/91/commits/a718915ddefa2f03a0126579601f59d8bd86f7c4)
at those exact draft heads.

### Typed config with `FromSchema`

`json-schema-to-ts` is an **optional** peer dependency. Install it to get
`FromSchema<typeof schema>` typing flowing into your `config.subscribe` callback;
skip it and `config.subscribe` still works with the default
`Record<string, unknown>` typing.

```ts
import { config } from '@napplet/sdk';
import type { FromSchema } from 'json-schema-to-ts';

const schema = {
  type: 'object',
  properties: { theme: { type: 'string', enum: ['light', 'dark'], default: 'dark' } },
  required: ['theme'],
} as const;

const sub = config.subscribe((values: FromSchema<typeof schema>) => {
  // values.theme is typed 'light' | 'dark'
});
```

## Namespace import

`import * as napplet from '@napplet/sdk'` produces an object structurally
identical to `window.napplet`:

```ts
import * as napplet from '@napplet/sdk';
const { events } = await napplet.outbox.query([{ kinds: [1], limit: 20 }]);
```

## See also

- [Runtime injection vs. SDK](/guide/getting-started#runtime-injection-vs-sdk)
- [`@napplet/shim`](./shim) — runtime-side injected global installer
