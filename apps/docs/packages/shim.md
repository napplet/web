# @napplet/shim

> Runtime-side helper for injecting selected `window.napplet.<domain>` objects
> before napplet scripts run.

`@napplet/shim` is consumed by NIP-5D runtimes, not by napplet application code.
The runtime calls its installer before any napplet script runs, injecting only
the NAP domain objects exposed to that napplet. It has no cryptographic
dependencies — the shim sends messages, and the shell handles identity, signing,
and encryption. **No `window.nostr` is installed.**

- **npm:** [`@napplet/shim`](https://www.npmjs.com/package/@napplet/shim)
- **JSR:** [`@napplet/shim`](https://jsr.io/@napplet/shim)
- **Source:** [packages/shim](https://github.com/napplet/napplet/tree/main/packages/shim)

## Install

```bash
npm install @napplet/shim
```

## Runtime export

`installNappletGlobal` installs selected domain objects onto a target window.
Napplet-side code should use [`@napplet/sdk`](./sdk) or direct typed
`window.napplet` access.

For `iframe.srcdoc` runtimes, `@napplet/shim/prelude` exposes a host-injectable
surface that does not require every napplet bundle to import the shim. Inline the
npm browser artifact from `@napplet/shim/prelude.global`, then activate it with
an explicit domain allowlist:

```ts
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { renderNappletRuntimePreludeCall } from '@napplet/shim/prelude';

const require = createRequire(import.meta.url);
const preludeSource = readFileSync(
  require.resolve('@napplet/shim/prelude.global'),
  'utf8',
);

const activatePrelude = renderNappletRuntimePreludeCall({
  domains: ['identity', 'storage', 'outbox'],
});

const srcdoc = html.replace(
  '<head>',
  `<head><script>${preludeSource}\n${activatePrelude}</script>`,
);
```

The IIFE artifact exposes `globalThis.NappletShimPrelude.install({ domains })`
and installs only the requested known NAP domains. JSR exposes the source ESM
helpers under `@napplet/shim/prelude`; the generated `prelude.global` artifact
is npm-only.

## The `window.napplet` shape

After runtime injection, the global may be populated with these sub-objects:

| Namespace | What it does |
| --- | --- |
| `outbox` | Outbox-aware `getEvent`, `query`, `subscribe`, `publish`, and `resolveRelays`; default for normal event reads and publishes |
| `common` | Profile lookup, follow/unfollow, reactions, reports, and NIP-19 helpers |
| `lists` | NIP-51 list read and mutation helpers |
| `count` | Count queries through the shell |
| `dm` | Shell-mediated encrypted direct-message helpers |
| `relay` | Low-level explicit relay proxy for relay-local escape hatches |
| `inc` | Inter-napplet communication: `emit`, `on` |
| `storage` | Scoped key-value storage: `getItem`, `setItem`, `removeItem`, `keys` (512 KB quota), plus `storage.instance.*` for per-instance scope |
| `keys` | Keyboard forwarding + action keybindings: `registerAction`, `unregisterAction`, `onAction` |
| `media` | Ownership-aware media sessions: `createSession`, `reportState`, `onCommand`, … |
| `notify` | Shell-rendered notifications: `send`, `badge`, `onAction`, … |
| `identity` | Read-only user queries: `getPublicKey`, `onChanged`, `getProfile`, … |
| `config` | Per-napplet declarative config: `get`, `subscribe`, `openSettings`, `registerSchema`, `schema` |
| `resource` | Sandboxed byte fetching: `info`, `bytes`, `bytesMany`, `bytesAsObjectURL` |
| Domain absence | If a property is absent, that NAP is unavailable to the napplet. |

## Usage

```ts
import { installNappletGlobal } from '@napplet/shim';

installNappletGlobal({
  domains: ['outbox', 'storage', 'identity'],
});
```

Napplet application code then consumes injected domains:

```ts
// Read kind 1 notes through outbox-aware routing
const { events } = await window.napplet.outbox.query(
  [{ kinds: [1], limit: 20 }],
  { timeoutMs: 3000 },
);
for (const result of events) console.log('Note:', result.event.content);

// Subscribe to live updates through the same outbox boundary
const sub = window.napplet.outbox.subscribe([{ kinds: [1], limit: 20 }], {
  timeoutMs: 3000,
});
sub.on('event', (result) => console.log('New note:', result.event.content));

// Publish a note (the shell signs and fans it out)
const published = await window.napplet.outbox.publish({
  kind: 1,
  content: 'Hello from my napplet!',
  tags: [],
  created_at: Math.floor(Date.now() / 1000),
});
if (!published.ok) throw new Error(published.error ?? 'publish failed');

// Scoped storage, proxied through the shell
await window.napplet.storage.setItem('theme', 'dark');
const theme = await window.napplet.storage.getItem('theme'); // 'dark'

// Read-only identity
const pubkey = await window.napplet.identity.getPublicKey(); // "" when signed out

// Feature-gate before using a domain
if (window.napplet?.media) {
  const { sessionId } = await window.napplet.media.createSession({
    owner: 'napplet',
    metadata: { title: 'My Song', artist: 'The Artist' },
  });
}

sub.close();
```

## TypeScript support

The shim does not modify global `Window` types in its published source (so it is
accepted by JSR). For typed `window.napplet` access, cast using `NappletGlobal`
from [`@napplet/core`](./core), or — preferably — use the named helpers in
[`@napplet/sdk`](./sdk):

```ts
import type { NappletGlobal } from '@napplet/core';

const napplet = (window as Window & { napplet: NappletGlobal }).napplet;
```

## Wire format

The shim communicates with the shell using JSON envelope messages
(`{ type: 'domain.action', ...payload }`). Outbound messages go via
`window.parent.postMessage(msg, '*')`; inbound arrive via a `message` listener.
Request/response pairs are correlated by an `id` field. The shim package README
documents the full per-domain outbound and inbound message catalog.

## See also

- [Shim vs. SDK](/guide/getting-started#when-to-use-shim-vs-sdk)
- [`@napplet/sdk`](./sdk) — named, typed wrapper over the same global
