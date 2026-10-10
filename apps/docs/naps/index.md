# NAP domain reference

A **NAP** (*Nostr Applet Protocol*) is one capability contract between a napplet and its runtime — what the runtime provides (relay access, storage, intents, …) and exactly how a napplet asks for it. On the web, [NIP-5D](/guide/nip-5d) binds each NAP to a **message domain**: a NAP named `foo` owns all `foo.*` JSON envelope messages, their payload shapes, and the expected shell behavior. NAP contracts are proposed and maintained in the [NAPs track](https://github.com/napplet/naps).

This non-normative guide defers to the living [NAP-INC](https://github.com/napplet/naps/blob/master/naps/NAP-INC.md), [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md), and [web projection](https://github.com/napplet/naps/blob/master/projections/web.md).

The protocol is modular by design. A NAP must be **independently implementable**, and shells may support **any subset** of NAPs. That's why napplets feature-gate with injected domain property presence before using a domain and degrade gracefully when it's absent — see [Core concepts](/guide/concepts#domain-presence).

These domains ship as subpaths of [`@napplet/nap`](/packages/nap) (barrel / `types` / `shim` / `sdk` per domain).

## The domains

Each domain below shows its purpose and a minimal example. Examples assume the runtime injected `window.napplet` before napplet code ran; the same calls are also importable as named helpers from [`@napplet/sdk`](/packages/sdk). Feature-gate optional domains with `if (window.napplet?.domain)` first.

### relay

Low-level Nostr relay proxy — subscribe, publish, and one-shot query through the shell's relay pool. Use this only for explicit relay-local behavior such as a group relay, diagnostics, or protocol tooling. For normal social reads and publishes, use [`outbox`](#outbox) or a higher-level domain such as [`common`](#common), [`lists`](#lists), [`count`](#count), or `dm`.

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
// The INC binding accepts a developer-facing convention URI when emitting:
window.napplet.inc.emit('napplet:profile/open?pubkey=abc123');

// The runtime sends topic `napplet:profile/open` with { pubkey: 'abc123' }.
// Another napplet subscribes to that exact stable topic:
const sub = window.napplet.inc.on('napplet:profile/open', (event) => {
  // `event.sender` is supplied by the runtime from the authenticated source endpoint.
  const target = (event.payload as { pubkey?: string }).pubkey;
});
```

`emit(topic, payload?)` transposes unique percent-decoded query pairs into a shallow text payload before posting the normalized message. Literal `+` stays `+`. Consumers subscribe to the stable queryless topic, and routing then uses exact equality with no query-aware, wildcard, or prefix matching. Fragments, malformed percent encoding, duplicate decoded names, and query plus explicit payload reject. Use a queryless topic with an explicit payload for structured or non-text data.

### keys

Keyboard bindings and action registration — the shell binds keys to named actions.

```ts
await window.napplet.keys.registerAction({ id: 'editor.save', label: 'Save', defaultKey: 'Ctrl+S' });
const sub = window.napplet.keys.onAction('editor.save', () => save());
```

### theme

Read-only shell theme access — colors, fonts, background, and title. The shell owns theming; the napplet reads it and reacts to changes.

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

Declarative per-napplet configuration (JSON Schema-driven). The shell renders the settings UI, validates, persists, and pushes live values; the shell is the sole writer.

```ts
const sub = window.napplet.config.subscribe((values) => applyTheme(values.theme as string));
window.napplet.config.openSettings({ section: 'appearance' });
```

### resource

Sandboxed byte fetching (`info() -> ResourceInfo`, `bytes(url, options?) -> Blob`, `bytesMany(requests) -> ResourceBytesItem[]`) over https / blossom / nostr / data schemes — the only network-fetch primitive available inside the iframe sandbox.

```ts
const info = await window.napplet.resource.info();
const blob = await window.napplet.resource.bytes('blossom:sha256:abc123…', {
  servers: ['https://cdn.hzrd149.com'],
});
const items = await window.napplet.resource.bytesMany([
  { url: 'https://example.com/avatar.png' },
  { url: 'blossom:sha256:abc123…', servers: ['https://cdn.hzrd149.com'] },
]);

// Managed object URL — revoke when done to free memory
const { url, revoke } = window.napplet.resource.bytesAsObjectURL('blossom:sha256:abc123…');
imgEl.src = url;
imgEl.onload = () => revoke();
```

### cvm

Native ContextVM bridge — MCP-over-Nostr (`discover` / `listTools` / `callTool` / `listResources` / `readResource` / `registry.*`); the shell owns transport, registry selection, and tool policy.

```ts
if (window.napplet?.cvm) {
  const servers = await window.napplet.cvm.discover({ search: 'relay' });
  const tools = await window.napplet.cvm.listTools(servers[0]);
  const result = await window.napplet.cvm.callTool(servers[0], tools[0].name, {});
}
```

### outbox

Outbox-aware relay routing — `getEvent` / `query` / `subscribe` / `publish` / `resolveRelays`; the shell owns NIP-65 relay discovery, fallback, dedup, signature validation, signing, and fanout. This is the default event-read and publish boundary when relay selection is part of result correctness.

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

Shell-mediated file/blob upload over NIP-96 + Blossom rails; the shell signs auth and returns NIP-94 metadata.

```ts
if (window.napplet?.upload) {
  const info = await window.napplet.upload.info();
  const result = await window.napplet.upload.upload({ data: blob, filename: 'pic.png' });
  if (result.status === 'complete') attach(result.url, result.nip94);
}
```

### intent

Intent calls derive archetype and action from the URI. An `ok: true` result means the runtime accepted delivery responsibility and includes the normalized identity and handler catalog identifier; an `ok: false` result includes `error`. Targets receive runtime-attested `IntentDelivery` values through `onDelivery`, including deliveries retained before registration. Behavior hints are `focus` and `reuse`. This non-normative guidance defers to the living [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md).

```ts
if (window.napplet?.intent) {
  const { available } = await window.napplet.intent.available('profile');
  if (available) {
    const result = await window.napplet.intent.open('napplet:profile/open', { payload: { pubkey: 'abc123' }, behavior: { reuse: false } });
    if (!result.ok) console.error(result.error);
  }
}
```

### ble

Runtime-mediated Bluetooth LE/GATT sessions. Napplets receive opaque session ids and byte arrays while the shell owns chooser UI, permissions, device handles, GATT lifecycle, notifications, disconnects, and policy.

```ts
if (window.napplet?.ble) {
  const { session } = await window.napplet.ble.open({ acceptAllDevices: true });
  const services = await window.napplet.ble.services(session.id);
}
```

### link

Shell-mediated external link opening. This is user-visible navigation, not byte fetching; the shell owns prompting, policy, opener isolation, and browser context.

```ts
if (window.napplet?.link) {
  const result = await window.napplet.link.open('https://example.com/post/123', {
    label: 'Read post',
  });
  if (result.status === 'denied') showInlineFallback();
}
```

### lists

Runtime-mediated NIP-51 list mutations. Napplets send add/remove intent while the runtime owns current-event lookup, kind/type mapping, tag formatting, private item encryption, event preservation, signing, and publishing.

```ts
if (window.napplet?.lists) {
  await window.napplet.lists.add({ type: 'mute-list' }, [
    { itemType: 'pubkey', value: 'abc123...' },
  ]);
}
```

### common

Common social actions — public NIP-19 helpers, profile lookup, follows, follow/unfollow, reactions, and reports. The shell owns identity, consent, event construction, signing, publishing, relay access, and NIP-19 handling.

```ts
if (window.napplet?.common) {
  const { pubkeys } = await window.napplet.common.follows();
  await window.napplet.common.react(eventId, '+');
}
```

### fs

Shell-mediated virtual filesystem access. Napplets discover visible roots, ask the runtime to mediate file and directory selection, inspect and list entries, read and write base64-encoded file bytes, create, remove and move them, and subscribe to advisory change events. The runtime owns host paths, mounts, backing store, normalization, policy, and authorization — the napplet sees only virtual paths.

`info()` is advisory discovery, not an authorization token: permissions can change mid-session and any operation can still fail.

```ts
if (window.napplet?.fs) {
  const picked = await window.napplet.fs.pickFile({ accept: [{ extension: '.md' }] });
  const bytes = await window.napplet.fs.read(picked.entries[0].path);
  await window.napplet.fs.write('/shared/copy.md', bytes.data, { mode: 'replace' });
  const entries = await window.napplet.fs.list('/shared');
  const watchId = await window.napplet.fs.watch('/shared', { recursive: true });
  window.napplet.fs.onChanged((change) => refresh(change.path));
}
```

`fs.write.data` and `FsReadResult.data` carry bytes as RFC 4648 standard padded base64 text on the JSON wire. Byte limits and result counts are decoded-byte counts.

## Core domain union

[`@napplet/core`](/packages/core) exports a `NapDomain` string union for the foundational domains — `shell`, `relay`, `identity`, `storage`, `inc`, `theme`, `keys`, `media`, `notify`, `config`, `resource`, `cvm`, `outbox`, `upload`, `intent`, `ble`, `webrtc`, `link`, `count`, `lists`, `serial`, `fs`, `common`, `dm` — used as the discriminant for envelope routing and domain presence.

## Where to go next

- [`@napplet/nap`](/packages/nap) — the package and its subpath patterns
- [`@napplet/sdk`](/packages/sdk) — typed helpers and per-domain message unions
- [NIP-5D explained](/guide/nip-5d#nap-extension-framework) — the NAP framework


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
