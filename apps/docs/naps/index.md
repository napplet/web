# NAP domain reference

A **NAP** (*Nostr Applet Protocol*) is one capability contract between a napplet
and its runtime — what the runtime provides (relay access, storage, intents, …)
and exactly how a napplet asks for it. On the web, [NIP-5D](/guide/nip-5d) binds
each NAP to a **message domain**: a NAP named `foo` owns all `foo.*` JSON envelope
messages, their payload shapes, and the expected shell behavior. NAP contracts are
proposed and maintained in the [NAPs track](https://github.com/napplet/naps).

The protocol is modular by design. A NAP must be **independently implementable**,
and shells may support **any subset** of NAPs. That's why napplets feature-gate
with `window.napplet.shell.supports('<domain>')` before using a domain and degrade
gracefully when it's absent — see [Core concepts](/guide/concepts#shell-supports).

These domains ship as subpaths of [`@napplet/nap`](/packages/nap) (barrel /
`types` / `shim` / `sdk` per domain).

## The domains

Each domain below shows its purpose and a minimal example. Examples assume the
shim is installed (`import '@napplet/shim'`) so `window.napplet` is available; the
same calls are also importable as named helpers from
[`@napplet/sdk`](/packages/sdk). Feature-gate optional domains with
`window.napplet.shell.supports('<domain>')` first.

### relay

Nostr relay proxy — subscribe, publish, and one-shot query through the shell's relay pool.

```ts
// Live subscription (returns a handle with .close())
const sub = window.napplet.relay.subscribe(
  [{ kinds: [1], limit: 20 }],
  (event) => render(event),
  () => console.log('end of stored events'),
);

// Publish — the shell signs; the napplet never holds keys
await window.napplet.relay.publish({
  kind: 1, content: 'gm', tags: [], created_at: Math.floor(Date.now() / 1000),
});

// One-shot query — resolves with an array after EOSE
const notes = await window.napplet.relay.query([{ kinds: [1], authors: [pubkey] }]);
```

### storage

Scoped key-value storage proxied through the shell — isolated per napplet identity.

```ts
await window.napplet.storage.setItem('draft', 'hello');
const draft = await window.napplet.storage.getItem('draft'); // string | null
const keys = await window.napplet.storage.keys();
```

### inc

Inter-napplet communication — topic-based publish/subscribe between napplets.

```ts
// One napplet broadcasts:
window.napplet.inc.emit('profile:open', [['p', pubkey]]);

// Another napplet listens:
const sub = window.napplet.inc.on('profile:open', (payload, event) => {
  const target = event.tags.find((t) => t[0] === 'p')?.[1];
});
```

### keys

Keyboard bindings and action registration — the shell binds keys to named actions.

```ts
await window.napplet.keys.registerAction({ id: 'editor.save', label: 'Save', defaultKey: 'Ctrl+S' });
const sub = window.napplet.keys.onAction('editor.save', () => save());
```

### theme

Read-only shell theme access — colors, fonts, background, and title. The shell owns
theming; the napplet reads it and reacts to changes.

```ts
const theme = await window.napplet.theme.get();
document.body.style.background = theme.colors.background;
const sub = window.napplet.theme.onChanged((t) => applyTheme(t));
```

### media

Ownership-aware media sessions and playback control.

```ts
const { sessionId } = await window.napplet.media.createSession({
  owner: 'napplet',
  metadata: { title: 'My Song', artist: 'The Artist' },
});
window.napplet.media.reportState(sessionId, { status: 'playing', position: 0, duration: 240 });
window.napplet.media.onCommand(sessionId, (action) => { if (action === 'pause') player.pause(); });
```

### notify

Shell-rendered notifications, badges, and interaction callbacks.

```ts
const { notificationId } = await window.napplet.notify.send({ title: 'New message', body: 'Alice: hey!' });
window.napplet.notify.badge(3);
window.napplet.notify.onAction((id, actionId) => { if (actionId === 'reply') openReply(id); });
```

### identity

Read-only user queries — pubkey, profile metadata, follows, … Never signs, encrypts, or decrypts.

```ts
const pubkey = await window.napplet.identity.getPublicKey();
const profile = await window.napplet.identity.getProfile();
const sub = window.napplet.identity.onChanged((pk) => reload(pk));
```

### config

Declarative per-napplet configuration (JSON Schema-driven). The shell renders the
settings UI, validates, persists, and pushes live values; the shell is the sole writer.

```ts
const sub = window.napplet.config.subscribe((values) => applyTheme(values.theme as string));
window.napplet.config.openSettings({ section: 'appearance' });
```

### resource

Sandboxed byte fetching (`bytes(url) → Blob`) over https / blossom / nostr / data
schemes — the only network-fetch primitive available inside the iframe sandbox.

```ts
const blob = await window.napplet.resource.bytes('https://example.com/avatar.png');

// Managed object URL — revoke when done to free memory
const { url, revoke } = window.napplet.resource.bytesAsObjectURL('blossom:sha256:abc123…');
imgEl.src = url;
imgEl.onload = () => revoke();
```

### cvm

Native ContextVM bridge — MCP-over-Nostr (`discover` / `listTools` / `callTool` /
`listResources` / `readResource`); the shell owns all transport.

```ts
if (window.napplet.shell.supports('cvm')) {
  const servers = await window.napplet.cvm.discover({ search: 'relay' });
  const tools = await window.napplet.cvm.listTools(servers[0]);
  const result = await window.napplet.cvm.callTool(servers[0], tools[0].name, {});
}
```

### outbox

Outbox-aware relay routing — `query` / `subscribe` / `publish` / `resolveRelays`; the
shell owns NIP-65 relay discovery, dedup, and fanout. Use instead of `relay` when relay
selection is part of result correctness.

```ts
if (window.napplet.shell.supports('outbox')) {
  const { events } = await window.napplet.outbox.query(
    [{ authors: ['ab12…'], kinds: [1], limit: 20 }],
    { strategy: 'outbox' },
  );
}
```

### upload

Shell-mediated file/blob upload over NIP-96 + Blossom rails; the shell signs auth and
returns NIP-94 metadata.

```ts
if (window.napplet.shell.supports('upload')) {
  const result = await window.napplet.upload.upload({ data: blob, filename: 'pic.png' });
  if (result.status === 'complete') attach(result.url, result.nip94);
}
```

### intent

Archetype intent dispatch — invoke another napplet by role, with the shell resolving the
default handler, window lifecycle, and trust boundary.

```ts
if (window.napplet.shell.supports('intent')) {
  const { available } = await window.napplet.intent.available('note');
  if (available) await window.napplet.intent.open('note', { target: { type: 'event', id } });
}
```

### common

Common social actions — public NIP-19 helpers, profile lookup, follows,
follow/unfollow, reactions, and reports. The shell owns identity, consent,
event construction, signing, publishing, relay access, and NIP-19 handling.

```ts
if (window.napplet.shell.supports('common')) {
  const { pubkeys } = await window.napplet.common.follows();
  await window.napplet.common.react(eventId, '+');
}
```

## Core domain union

[`@napplet/core`](/packages/core) exports a `NapDomain` string union for the
foundational domains — `relay`, `identity`, `storage`, `inc`, `theme`,
`keys`, `media`, `notify`, `config`, `resource`, `cvm`, `outbox`,
`upload`, `intent`, `common` — used as the discriminant for envelope routing and
`shell.supports()`.

## Where to go next

- [`@napplet/nap`](/packages/nap) — the package and its subpath patterns
- [`@napplet/sdk`](/packages/sdk) — typed helpers and per-domain message unions
- [NIP-5D explained](/guide/nip-5d#nap-extension-framework) — the NAP framework
