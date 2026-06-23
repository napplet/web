# @napplet/shim

> Side-effect-only window installer for napplet iframes. Importing it installs the
> `window.napplet` global. No named exports.

`@napplet/shim` is the one package every napplet **must** import. The import is a
**side effect**: it installs `window.napplet`, registers with the shell (which
assigns identity from the iframe's `message.source`), and wires up the JSON
envelope message handlers. It has no cryptographic dependencies — the shim sends
messages, and the shell handles identity, signing, and encryption. **No
`window.nostr` is installed.**

- **npm:** [`@napplet/shim`](https://www.npmjs.com/package/@napplet/shim)
- **JSR:** [`@napplet/shim`](https://jsr.io/@napplet/shim)
- **Source:** [packages/shim](https://github.com/napplet/napplet/tree/main/packages/shim)

## Install

```bash
npm install @napplet/shim
```

## Named exports

**None.** `import { anything } from '@napplet/shim'` is a TypeScript error. The
package exists purely for its side effect. For named, typed access use
[`@napplet/sdk`](./sdk).

## The `window.napplet` shape

After `import '@napplet/shim'`, the global is populated with these sub-objects:

| Namespace | What it does |
| --- | --- |
| `relay` | `subscribe`, `publish`, `publishEncrypted`, `query` through the shell's relay pool |
| `inc` | Inter-napplet communication: `emit`, `on` |
| `storage` | Scoped key-value storage: `getItem`, `setItem`, `removeItem`, `keys` (512 KB quota), plus `storage.instance.*` for per-instance scope |
| `keys` | Keyboard forwarding + action keybindings: `registerAction`, `unregisterAction`, `onAction` |
| `media` | Ownership-aware media sessions: `createSession`, `reportState`, `onCommand`, … |
| `notify` | Shell-rendered notifications: `send`, `badge`, `onAction`, … |
| `identity` | Read-only user queries: `getPublicKey`, `onChanged`, `getProfile`, … |
| `config` | Per-napplet declarative config: `get`, `subscribe`, `openSettings`, `registerSchema`, `schema` |
| `resource` | Sandboxed byte fetching: `bytes`, `bytesMany`, `bytesAsObjectURL` |
| `shell` | NAP-SHELL bootstrap handshake: `supports(domain, protocol?)`, `services`, `ready()`, `onReady()` |

## Usage

```ts
// Side-effect import — installs window.napplet (no window.nostr)
import '@napplet/shim';

// Subscribe to kind 1 notes
const sub = window.napplet.relay.subscribe(
  { kinds: [1], limit: 20 },
  (event) => console.log('New note:', event.content),
  () => console.log('End of stored events'),
);

// Publish a note (the shell signs it)
const signed = await window.napplet.relay.publish({
  kind: 1,
  content: 'Hello from my napplet!',
  tags: [],
  created_at: Math.floor(Date.now() / 1000),
});

// Scoped storage, proxied through the shell
await window.napplet.storage.setItem('theme', 'dark');
const theme = await window.napplet.storage.getItem('theme'); // 'dark'

// Read-only identity
const pubkey = await window.napplet.identity.getPublicKey(); // "" when signed out

// Feature-gate before using a domain
if (window.napplet.shell.supports('media')) {
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
import '@napplet/shim';

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
