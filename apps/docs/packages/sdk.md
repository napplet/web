# @napplet/sdk

> Named TypeScript exports for napplet developers using a bundler. Wraps
> `window.napplet` at call time.

`@napplet/sdk` gives napplet code typed, named imports that delegate to injected `window.napplet.*` counterparts. It depends on [`@napplet/core`](./core) for types only and has **no side effects**. If a method is called before the runtime injected `window.napplet`, or before that domain is available, the SDK throws a clear error.

- **npm:** [`@napplet/sdk`](https://www.npmjs.com/package/@napplet/sdk)
- **JSR:** [`@napplet/sdk`](https://jsr.io/@napplet/sdk)
- **Source:** [packages/sdk](https://github.com/napplet/web/tree/main/packages/sdk)

NAP proposal status and shipped implementation maturity are separate. All capabilities can change. Inspect `NAP_IMPLEMENTATIONS` from `@napplet/core` and use `selectNapDomains` for local host opt-in policy. See [maturity and opt-in guidance](https://napplet.run/docs/naps/maturity.html).

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
- **`intent`** — `invoke`, `open`, `available`, `handlers`, `onChanged`, `onDelivery`
- **`navigation`** — `report`, `get` (runtime-owned history; requires INTENT)
- **`storage`** — `getItem`, `setItem`, `removeItem`, `keys`, plus `storage.instance.*` (per-instance scope)
- **`keys`** — `registerAction`, `unregisterAction`, `onAction`
- **`media`** — `createSession`, `reportState`, `onCommand`, …
- **`notify`** — `send`, `badge`, `onAction`, …
- **`config`** — `get`, `subscribe`, `openSettings`, `registerSchema`, `schema`
- **`llm`** — User-selected, runtime-mediated language model inference: `select`, `describe`, `generate`, `cancel`
- **`torrent`** — Runtime transfer jobs, verified content access, and job event listeners
- **`soulseek`** — Runtime-mediated Soulseek search, browsing, paginated results, transfers, bounded reads, saving, and release
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

// Fetch external bytes through the shell (`blossom:<sha256>.<ext>` URIs follow BUD-10: https://github.com/hzrd149/blossom/blob/master/buds/10.md)
const avatarBlob = await resource.bytes('blossom:<sha256>.png', {
  servers: ['https://cdn.hzrd149.com'],
});
const avatarItems = await resource.bytesMany([
  { url: 'https://example.com/avatar.png' },
  { url: 'blossom:<sha256>.png', servers: ['https://cdn.hzrd149.com'] },
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

Intent calls derive archetype and action from the URI. An `ok: true` result means the runtime accepted delivery responsibility and includes the normalized identity and handler catalog identifier; an `ok: false` result includes `error`. Targets receive runtime-attested `IntentDelivery` values through `onDelivery`, including deliveries retained before registration. `sender` is the runtime-attested source catalog identifier. A shell replay to a selected instance is an ordinary delivery whose `sender` is the target's own catalog identifier. Deliveries carry no `id`. This follows the [NAP-INTENT selected-instance delivery draft](https://github.com/napplet/naps/pull/128). Behavior hints are `focus` and `reuse`. This non-normative guidance defers to the living [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md).

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

### Controller snapshots

This non-normative guidance defers to [NAP-GAMEPAD](https://github.com/napplet/naps/pull/108). When the runtime exposes `window.napplet.gamepad`, the SDK provides cached `getGamepads()`, read-only `available` and `focused`, and `onChange(handler)` with an independently closable listener. Keep keyboard or pointer controls available when the domain or native controllers are unavailable. Ignore gameplay edges while unfocused, and reset the button baseline on regained focus. Preserve null slots and route controllers by their `index`.

```ts
import { gamepad } from '@napplet/sdk/gamepad';

if (window.napplet?.gamepad) {
  const subscription = gamepad.onChange(state => {
    if (!state.available || !state.focused) return;
    for (const pad of state.pads) {
      if (pad) console.log(pad.index, pad.axes);
    }
  });
  // Call subscription.close() when the owning view is disposed, not right away.
}
```

Declare `gamepad` as optional (`O`) when other controls fulfill the core task. Use a hard requirement (`R`) only when the core task needs controller input. The runtime owns controller access and focus isolation; app code does not call native `navigator.getGamepads()` or open raw HID devices. Haptics and remapping are outside this proposal.
### Language model inference

This non-normative guide follows the living [NAP-LLM proposal](https://github.com/napplet/naps/pull/134). Import `llm` from `@napplet/sdk` or `@napplet/sdk/llm`; root exports include prefixed helpers such as `llmSelect` and `llmGenerate`. The dedicated subpath also provides bare aliases such as `select` and `generate`.

The API exposes `select`, `describe`, `generate`, and `cancel`. `generate` returns a pending promise that exposes `requestId`; pass `onDelta` for ordered provisional `start` / `delta` / `end` block events and `signal` to map an abort to `llm.cancel`, and replace provisional output with the terminal `content` parts. `llmText(generation)` concatenates the text parts; `llmToolCalls(generation)` returns tool calls only from a `finish: "toolUse"` result. Each method resolves with the proposal's result record; a runtime `Error` record rejects with an `Error` carrying the specification `code`, recognizable with `isLlmFailure(error)`, while the binding's own transport timeout rejects without a `code`.

```ts
import { llm, isLlmFailure, llmText } from '@napplet/sdk/llm';

if (window.napplet?.llm) {
  try {
    const model = await llm.select({ json: true });
    const generation = await llm.generate({
      handle: model.handle,
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Return a JSON object with a greeting.' }] }],
      format: 'json',
    });
    if (generation.finish === 'stop') render(JSON.parse(llmText(generation)));
  } catch (error) {
    if (isLlmFailure(error)) console.warn(error.code, error.message);
    else throw error;
  }
}
```

Selection does not authorize disclosure: the runtime obtains consent before each generation and may answer `user-cancelled`. Only `finish: "stop"` is complete output. Tool calls are requests the napplet validates and executes itself, if at all, through separately authorized capabilities; the runtime never executes them, and tool results re-enter the conversation as untrusted input. Handles are endpoint-scoped and expire when the connection, account, or endpoint changes. The runtime owns connections, credentials, consent, and provider access; model output is untrusted data.

## Navigation history

The `navigation` object is exported by the root and `@napplet/sdk/navigation`. Call `navigation.report(report)` or `navigation.get()`; both return a structured `NavigationResult`. Named `navigationReport` / `navigationGet` helpers are also available, with `report` / `get` aliases on the subpath. This non-normative guidance targets the [NAP-NAVIGATION draft](https://github.com/napplet/naps/pull/126) and [NAP-INTENT delivery draft](https://github.com/napplet/naps/pull/128). See [Navigation](/naps/navigation) for runtime availability, manifest declarations, serialized reporting, and recovery.

## Blossom blob access

The SDK exposes `blossom` from `@napplet/sdk` and `@napplet/sdk/blossom` for server-directed blob operations, ordered BUD-03 server-list helpers and local BUD-10 URI parsing/formatting. Check `window.napplet?.blossom` before optional use. Binary fields remain `Blob` or `ArrayBuffer`; endpoint failures resolve with `ok: false`, while malformed-envelope errors and transport failures reject. Use `resource` for generic retrieval and `upload` when the runtime should choose storage. See the non-normative [BLOSSOM guide](https://napplet.run/docs/naps/blossom.html) and living [NAP-BLOSSOM proposal](https://github.com/napplet/naps/pull/71).

## Catalog support

Import `catalog` or `catalogGet` from the SDK root, or `catalog` / `get` from `@napplet/sdk/catalog`. Call `catalog.get()` after checking optional domain presence. This implements the [NAP-CATALOG draft](https://github.com/napplet/naps/pull/95). See the [non-normative catalog guide](/naps/catalog) for types, layered exports, SDK usage, runtime injection, and selector handling.

### Torrent transfers and content

This non-normative guide follows the living [NAP-TORRENT proposal](https://github.com/napplet/naps/blob/nap-torrent/naps/NAP-TORRENT.md). Import `torrent` from `@napplet/sdk` or `@napplet/sdk/torrent`; root exports include prefixed helpers such as `torrentAdd` and `torrentRead`. The dedicated subpath also provides bare aliases such as `add` and `read`.

The API exposes `capabilities`, `pickFiles`, `add`, `status`, `jobs`, `files`, `selectFiles`, `pause`, `resume`, `remove`, `metadata`, `read`, `exportMetainfo`, `saveFile`, `openFile`, `cancel`, and `update`. Listen with `onState`, `onProgress`, and `onError`; close subscriptions when their owning view is disposed. Typed `ok: false` refusals resolve as results; top-level errors and request timeouts reject.

```ts
import { torrent } from '@napplet/sdk/torrent';

if (window.napplet?.torrent) {
  const ack = await torrent.add({
    source: {
      sourceType: 'infohash',
      hashes: { v1: '0123456789abcdef0123456789abcdef01234567' },
    },
    options: { mode: 'download', startPaused: true },
  });
  if (!ack.ok) console.error(ack.error, ack.reason);
  else console.log(await torrent.status(ack.jobId));
}
```

`add` acknowledges job creation, not completion. The runtime owns the engine, consent, storage, and network policy. A file-picker grant authorizes seeding only; reading, saving, or opening that data needs separate authorization. Discovery, Nostr event conversion, publishing, and comments belong to other capabilities or napplet libraries, outside `torrent`.

### Soulseek discovery and downloads

This non-normative guide follows the living [NAP-SOULSEEK proposal](https://github.com/napplet/naps/pull/135). Import `soulseek` from `@napplet/sdk` or `@napplet/sdk/soulseek`; root exports include prefixed helpers such as `soulseekSearch` and `soulseekRead`. The dedicated subpath also provides bare aliases such as `search` and `read`.

The API exposes `info`, `search`, `browse`, `results`, `stop`, `download`, `transfers`, `status`, `pause`, `resume`, `cancel`, `read`, `save`, and `release`. There are no listeners or pushes: poll `results`, `status`, and `transfers` no faster than `info().pollIntervalMs`. Each method resolves with the proposal's result record; a runtime `Failure` rejects with an `Error` carrying the specification `code`, recognizable with `isSoulseekFailure(error)`, while the binding's own transport timeout rejects without a `code`.

```ts
import { soulseek, isSoulseekFailure } from '@napplet/sdk/soulseek';

if (window.napplet?.soulseek) {
  const info = await soulseek.info();
  if (info.state === 'online') {
    const query = await soulseek.search({ text: 'field recording' });
    const page = await soulseek.results(query.queryId, 0, info.maxPageSize);
    try {
      const transfer = await soulseek.download(page.files[0].fileId);
      console.log(transfer.state, transfer.received);
    } catch (error) {
      if (isSoulseekFailure(error)) console.warn(error.code, error.message);
      else throw error;
    }
  }
}
```

Queries are admitted as `collecting` and settle on later polls; `download` acknowledges admission, not completion. File sizes, received counts, and read offsets are canonical decimal text, never numbers. Handles are endpoint-scoped and never survive a reload. The runtime owns the account, peer networking, storage, content disclosure (`read` needs a separate grant), and saving; peer names and paths are untrusted text.
