# NAP domain reference

A **NAP** (*Nostr Applet Protocol*) is one capability contract between a napplet
and its runtime — what the runtime provides (relay access, storage, intents, …)
and exactly how a napplet asks for it. On the web, [NIP-5D](/guide/nip-5d) binds
each NAP to a **message domain**: a NAP named `foo` owns all `foo.*` JSON envelope
messages, their payload shapes, and the expected shell behavior. NAP contracts are
proposed and maintained in the [NAPs track](https://github.com/napplet/naps).

The protocol is modular by design. A NAP must be **independently implementable**,
and shells may support **any subset** of NAPs. That's why napplets feature-gate
with injected domain property presence before using a domain and degrade
gracefully when it's absent — see [Core concepts](/guide/concepts#domain-presence).

These domains ship as subpaths of [`@napplet/nap`](/packages/nap) (barrel /
`types` / `shim` / `sdk` per domain).

## The domains

Each domain below shows its purpose and a minimal example. Examples assume the
runtime injected `window.napplet` before napplet code ran; the same calls are also importable as named helpers from
[`@napplet/sdk`](/packages/sdk). Feature-gate optional domains with
`if (window.napplet?.domain)` first.

### relay

Low-level Nostr relay proxy — subscribe, publish, and one-shot query through the
shell's relay pool. Use this only for explicit relay-local behavior such as a
group relay, diagnostics, or protocol tooling. For normal social reads and
publishes, use [`outbox`](#outbox) or a higher-level domain such as
[`common`](#common), [`lists`](#lists), [`count`](#count), or `dm`.

```ts
// Explicit relay-local subscription (returns a handle with .close())
const sub = window.napplet.relay.subscribe(
  [{ kinds: [9, 10, 11, 12], limit: 20 }],
  (result) => render(result.event),
  () => console.log('end of stored events'),
  { relay: 'wss://groups.example.com' },
);
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
// One napplet may use a convention URI only when emitting:
window.napplet.inc.emit('napplet:profile/open?pubkey=abc123');

// The runtime sends topic `napplet:profile/open` with { pubkey: 'abc123' }.
// Another napplet subscribes to that exact stable topic:
const sub = window.napplet.inc.on('napplet:profile/open', (payload, sender) => {
  const target = (payload as { pubkey?: string }).pubkey;
});
```

Only `emit(topic, payload?)` accepts the queried convention URI. It transposes
unique decoded query pairs into a shallow text payload before routing; consumers
subscribe to the stable queryless topic and routing then uses exact equality.
Routing has no query-aware, wildcard, or prefix matching. Use an explicit
payload with a queryless topic for structured data, and keep NAP-INTENT and
manifest convention values opaque. See [NAP-INC at PR #89's pinned head](https://github.com/napplet/naps/blob/34ec29fc4039384a83dbd6b476f83c4fa0d038e6/naps/NAP-INC.md)
for the normative convention-URI rules.

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

Sandboxed byte fetching (`info() -> ResourceInfo`, `bytes(url) -> Blob`, `bytesMany(urls) -> ResourceBytesItem[]`)
over https / blossom / nostr / data schemes — the only network-fetch primitive
available inside the iframe sandbox.

```ts
const info = await window.napplet.resource.info();
const blob = await window.napplet.resource.bytes('https://example.com/avatar.png');
const items = await window.napplet.resource.bytesMany([
  'https://example.com/avatar.png',
  'blossom:sha256:abc123…',
]);

// Managed object URL — revoke when done to free memory
const { url, revoke } = window.napplet.resource.bytesAsObjectURL('blossom:sha256:abc123…');
imgEl.src = url;
imgEl.onload = () => revoke();
```

### cvm

Native ContextVM bridge — MCP-over-Nostr (`discover` / `listTools` / `callTool` /
`listResources` / `readResource` / `registry.*`); the shell owns transport,
registry selection, and tool policy.

```ts
if (window.napplet?.cvm) {
  const servers = await window.napplet.cvm.discover({ search: 'relay' });
  const tools = await window.napplet.cvm.listTools(servers[0]);
  const result = await window.napplet.cvm.callTool(servers[0], tools[0].name, {});
}
```

### outbox

Outbox-aware relay routing — `getEvent` / `query` / `subscribe` / `publish` /
`resolveRelays`; the shell owns NIP-65 relay discovery, fallback, dedup,
signature validation, signing, and fanout. This is the default event-read and
publish boundary when relay selection is part of result correctness.

```ts
if (window.napplet?.outbox) {
  await window.napplet.outbox.getEvent('ev1…', { author: 'ab12…' });
  const { events } = await window.napplet.outbox.query(
    [{ authors: ['ab12…'], kinds: [1], limit: 20 }],
    { authors: ['ab12…'], timeoutMs: 3000 },
  );
  const sub = window.napplet.outbox.subscribe(
    [{ authors: ['ab12…'], kinds: [1], limit: 20 }],
    { authors: ['ab12…'], timeoutMs: 3000 },
  );
  sub.on('event', (result) => render(result.event, result.sidecar?.relayHints));

  await window.napplet.outbox.publish({
    kind: 1,
    content: 'gm',
    tags: [],
    created_at: Math.floor(Date.now() / 1000),
  });
}
```

### upload

Shell-mediated file/blob upload over NIP-96 + Blossom rails; the shell signs auth and
returns NIP-94 metadata.

```ts
if (window.napplet?.upload) {
  const info = await window.napplet.upload.info();
  const result = await window.napplet.upload.upload({ data: blob, filename: 'pic.png' });
  if (result.status === 'complete') attach(result.url, result.nip94);
}
```

### intent

Archetype intent dispatch — invoke another napplet by role, with the shell resolving the
default handler, window lifecycle, and trust boundary.

```ts
if (window.napplet?.intent) {
  const { available } = await window.napplet.intent.available('note');
  if (available) await window.napplet.intent.open('note', { target: { type: 'event', id } });
}
```

### ble

Runtime-mediated Bluetooth LE/GATT sessions. Napplets receive opaque session ids
and byte arrays while the shell owns chooser UI, permissions, device handles,
GATT lifecycle, notifications, disconnects, and policy.

```ts
if (window.napplet?.ble) {
  const { session } = await window.napplet.ble.open({ acceptAllDevices: true });
  const services = await window.napplet.ble.services(session.id);
}
```

### link

Shell-mediated external link opening. This is user-visible navigation, not byte
fetching; the shell owns prompting, policy, opener isolation, and browser context.

```ts
if (window.napplet?.link) {
  const result = await window.napplet.link.open('https://example.com/post/123', {
    label: 'Read post',
  });
  if (result.status === 'denied') showInlineFallback();
}
```

### lists

Runtime-mediated NIP-51 list mutations. Napplets send add/remove intent while the
runtime owns current-event lookup, kind/type mapping, tag formatting, private
item encryption, event preservation, signing, and publishing.

```ts
if (window.napplet?.lists) {
  await window.napplet.lists.add({ type: 'mute-list' }, [
    { itemType: 'pubkey', value: 'abc123...' },
  ]);
}
```

### common

Common social actions — public NIP-19 helpers, profile lookup, follows,
follow/unfollow, reactions, and reports. The shell owns identity, consent,
event construction, signing, publishing, relay access, and NIP-19 handling.

```ts
if (window.napplet?.common) {
  const { pubkeys } = await window.napplet.common.follows();
  await window.napplet.common.react(eventId, '+');
}
```

## Core domain union

[`@napplet/core`](/packages/core) exports a `NapDomain` string union for the
foundational domains — `relay`, `identity`, `storage`, `inc`, `theme`,
`keys`, `media`, `notify`, `config`, `resource`, `cvm`, `outbox`,
`upload`, `intent`, `ble`, `webrtc`, `link`, `lists`, `serial`, `common` — used as the discriminant for envelope routing and
domain presence.

## Where to go next

- [`@napplet/nap`](/packages/nap) — the package and its subpath patterns
- [`@napplet/sdk`](/packages/sdk) — typed helpers and per-domain message unions
- [NIP-5D explained](/guide/nip-5d#nap-extension-framework) — the NAP framework
