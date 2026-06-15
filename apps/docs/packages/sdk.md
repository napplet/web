# @napplet/sdk

> Named TypeScript exports for napplet developers using a bundler. Wraps
> `window.napplet` at call time.

`@napplet/sdk` gives you typed, named imports that delegate to their
`window.napplet.*` counterparts. It depends on [`@napplet/core`](./core) for types
only and has **no side effects** — so you still need
[`@napplet/shim`](./shim) imported first to install the runtime. If a method is
called before the shim installed `window.napplet`, the SDK throws a clear error.

- **npm:** [`@napplet/sdk`](https://www.npmjs.com/package/@napplet/sdk)
- **JSR:** [`@napplet/sdk`](https://jsr.io/@napplet/sdk)
- **Source:** [packages/sdk](https://github.com/napplet/napplet/tree/main/packages/sdk)

## Install

```bash
npm install @napplet/sdk @napplet/shim
```

## Key exports

Top-level namespaced objects that mirror `window.napplet`:

- **`relay`** — `subscribe`, `publish`, `publishEncrypted`, `query`
- **`inc`** — `emit`, `on` (plus deprecated `ifc*` migration aliases)
- **`storage`** — `getItem`, `setItem`, `removeItem`, `keys`
- **`keys`** — `registerAction`, `unregisterAction`, `onAction`
- **`media`** — `createSession`, `reportState`, `onCommand`, …
- **`notify`** — `send`, `badge`, `onAction`, …
- **`config`** — `get`, `subscribe`, `openSettings`, `registerSchema`, `schema`
- **`resource`** — `bytes`, `bytesAsObjectURL`

`identity`, `connect`, `class`, and `shell` are **not** exported as top-level
objects. Use `window.napplet.identity.*` / `window.napplet.shell.supports()`
directly, or the bare-name helpers the SDK re-exports:

- `identityGetPublicKey`, `identityOnChanged`
- `connectGranted`, `connectOrigins`, `normalizeConnectOrigin`
- `getClass`, plus the `*_DOMAIN` constants and `install*Shim` installers
- `resourceBytes`, `resourceBytesAsObjectURL`

It also re-exports the protocol types from `@napplet/core` and the per-domain
message-type unions (`RelayNapMessage`, `IdentityNapMessage`, …) and `*_DOMAIN`
constants from the NAP packages.

## Usage

```ts
import '@napplet/shim'; // required: installs window.napplet
import { relay, inc, storage, keys, config, resource, type NostrEvent } from '@napplet/sdk';

// Subscribe to kind 1 notes
const sub = relay.subscribe(
  { kinds: [1], limit: 20 },
  (event) => console.log('New note:', event.content),
  () => console.log('End of stored events'),
);

// Publish a signed note
const signed = await relay.publish({
  kind: 1,
  content: 'Hello from my napplet!',
  tags: [],
  created_at: Math.floor(Date.now() / 1000),
});

// Inter-napplet messaging
inc.emit('chat:message', [], JSON.stringify({ text: 'hi' }));

// Scoped storage
await storage.setItem('theme', 'dark');

// Live per-napplet config
const configSub = config.subscribe((values) => applyTheme(values.theme));

// Fetch external bytes through the shell (direct fetch is blocked by CSP)
const avatarBlob = await resource.bytes('https://example.com/avatar.png');
```

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
napplet.relay.subscribe({ kinds: [1] }, (e) => console.log(e));
```

## See also

- [Shim vs. SDK](/guide/getting-started#when-to-use-shim-vs-sdk)
- [`@napplet/shim`](./shim) — installs the global this package wraps
