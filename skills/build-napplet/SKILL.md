---
name: build-napplet
description: Use when writing a napplet (sandboxed Nostr iframe app) using @napplet/shim — covers Vite project setup, NIP-5A manifest plugin, subscribe/publish/query relay API, scoped storage, inter-napplet events, the resource NAP for sandboxed byte fetching (replaces direct fetch / <img src=externalUrl>, both of which the iframe CSP blocks), NAP-CLASS + NAP-CONNECT for shell-assigned security class and user-gated direct network access, and read-only NAP-IDENTITY public-key tracking
---

# Building a Napplet with @napplet/shim

## Overview

A napplet is a sandboxed iframe app that communicates with a host shell via postMessage using NIP-01 wire format. The shim (`@napplet/shim`) provides the full client-side API — relay subscriptions, event signing proxy, scoped storage, and inter-napplet messaging. The iframe runs without `allow-same-origin`; all host access is proxied over postMessage. The napplet never holds private keys — signing is delegated to the shell signer.

## Prerequisites

- Node.js 18+, pnpm (or npm/yarn)
- A Vite-based project (`pnpm create vite`)
- A host shell that implements the napplet protocol (NIP-5D)

## Step 1 — Install dependencies

```bash
pnpm add @napplet/shim
pnpm add -D @napplet/vite-plugin
```

## Step 2 — Configure the Vite plugin

The vite plugin injects a `<meta name="napplet-aggregate-hash">` tag at build time, which the shim uses for version-scoped storage and ACL. The `nappletType` option is required.

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { nip5aManifest } from '@napplet/vite-plugin';

export default defineConfig({
  plugins: [
    nip5aManifest({
      nappletType: 'my-napplet',
      // requires: ['audio', 'notifications'], // optional: declared service dependencies
    }),
  ],
});
```

Set `VITE_DEV_PRIVKEY_HEX` env var to a hex-encoded 32-byte private key to produce signed NIP-5A manifests in CI. Dev builds work without it — the aggregate hash is still computed and injected.

## Step 3 — Subscribe to relay events

Import `subscribe` from `@napplet/shim`. The subscription is a live stream; use `sub.close()` to unsubscribe.

```ts
import { subscribe } from '@napplet/shim';
import type { NostrEvent } from '@napplet/shim';

const myPubkey = await window.napplet.identity.getPublicKey();

const sub = subscribe(
  { kinds: [1], authors: [myPubkey], limit: 20 },
  (event: NostrEvent) => {
    console.log('New note:', event.content);
  },
  () => {
    console.log('EOSE — initial events loaded');
  },
);

// Later, when the component is destroyed:
sub.close();
```

## Step 4 — Publish an event

Import `publish` from `@napplet/shim`. Signing is delegated to the shell signer — the napplet never holds private keys. Always `await` the call.

```ts
import { publish } from '@napplet/shim';

const signed = await publish({
  kind: 1,
  content: 'Hello from a napplet!',
  tags: [],
  created_at: Math.floor(Date.now() / 1000),
});

console.log('Published event id:', signed.id);
```

## Step 5 — Query cached events

`query()` is a one-shot snapshot — it collects events until EOSE, then resolves. Use `subscribe()` for live updates.

```ts
import { query } from '@napplet/shim';

const events = await query({ kinds: [1], limit: 50 });
console.log(`Loaded ${events.length} notes from cache`);
```

## Step 6 — Use nappletState

Import `nappletState` from `@napplet/shim`. Storage is scoped by `nappletType:aggregateHash` — different napplet versions have isolated storage namespaces. Do not use `localStorage` directly (it throws `SecurityError` without `allow-same-origin`).

```ts
import { nappletState } from '@napplet/shim';

// Store a string value
await nappletState.setItem('last-seen', Date.now().toString());

// Retrieve a value (returns string | null)
const raw = await nappletState.getItem('last-seen');
const lastSeen = raw ? Number(raw) : 0;

// Store objects using JSON.stringify / JSON.parse
await nappletState.setItem('settings', JSON.stringify({ theme: 'dark', fontSize: 14 }));
const raw2 = await nappletState.getItem('settings');
const settings = raw2 ? JSON.parse(raw2) : {};

// Remove a key
await nappletState.removeItem('last-seen');
```

Additional methods: `nappletState.clear()` (removes all keys for this napplet), `nappletState.keys()` (returns all stored keys as `string[]`).

> **Deprecated aliases:** `nappStorage` and `nappState` are deprecated aliases for `nappletState`. They will be removed in v0.9.0.

## Step 7 — Use read-only identity (NAP-IDENTITY)

```ts
import '@napplet/shim';

// Snapshot the current shell user. Returns "" when no user/signer is connected.
const pubkey: string = await window.napplet.identity.getPublicKey();

// Track shell-pushed identity changes instead of polling.
const identitySub = window.napplet.identity.onChanged((nextPubkey) => {
  if (nextPubkey === '') {
    showSignedOutState();
    return;
  }

  loadProfile(nextPubkey);
});

// Later, when the component is destroyed:
identitySub.close();
```

`window.napplet.identity` is strictly read-only. It does not sign, encrypt, or decrypt. Publish signed events through `window.napplet.relay.publish(...)`; use relay-level encrypted publish helpers where available. Received ciphertext is not decrypted through identity.

## Step 8 — Inter-napplet events (emit / on)

Inter-napplet events let napplets communicate with each other through the shell. `window.napplet.inc.emit()` broadcasts to all topic subscribers; `window.napplet.inc.on()` subscribes to a specific topic.

```ts
import '@napplet/shim';
// or: import { inc } from '@napplet/sdk';

// Broadcast an event to all napplets subscribed to 'profile:open'
window.napplet.inc.emit('profile:open', [], JSON.stringify({ pubkey: '3bf0c63...' }));

// Subscribe to inter-napplet events on a topic
const sub = window.napplet.inc.on('profile:open', (payload: unknown) => {
  const { pubkey } = payload as { pubkey: string };
  console.log('Profile open requested for:', pubkey);
});

// Unsubscribe when done
sub.close();
```

The `emit()` signature: `emit(topic: string, extraTags?: string[][], content?: string): void`.

## Step 9 — Service discovery

Services are shell-side handlers that napplets communicate with via topic events. Discover what the shell provides before using service-specific APIs.

```ts
import { discoverServices, hasService, hasServiceVersion } from '@napplet/shim';

// List all available services
const services = await discoverServices();
// [{ name: 'audio', version: '1.0.0', description: '...' }, ...]

// Check if a specific service is available
if (await hasService('audio')) {
  // Safe to use audio service APIs
  emit('audio:register', [], JSON.stringify({ nappletClass: 'media-player', title: 'My Player' }));
}

// Check for a specific version
if (await hasServiceVersion('audio', '1.0.0')) {
  // Audio v1.0.0 features are available
}
```

`discoverServices()` results are session-cached — subsequent calls return the same array without a network round-trip. Cache is cleared on page reload.

## Step 10 — Fetch external bytes (resource NAP, v0.28.0+)

The iframe sandbox (no `allow-same-origin`) plus strict CSP (`connect-src 'none'`) means `fetch()`, `<img src="https://...">`, `XMLHttpRequest`, and `new WebSocket(...)` are all blocked by the browser. Any external bytes — avatars, blossom-served images, NIP-19 resource resolution — flow through the shell via the resource NAP.

```ts
import '@napplet/shim';

// Fetch any URL the shell accepts. Returns a Blob.
const blob: Blob = await window.napplet.resource.bytes('https://example.com/avatar.png');
const objectUrl = URL.createObjectURL(blob);
imgEl.src = objectUrl;
// remember to URL.revokeObjectURL(objectUrl) when done

// Or use the synchronous handle helper:
const handle = window.napplet.resource.bytesAsObjectURL('blossom:sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
imgEl.src = handle.url;            // populated once the underlying fetch resolves
// later
handle.revoke();
```

Four canonical schemes are supported:

| Scheme | Example | Resolution |
|--------|---------|------------|
| `data:` | `data:image/png;base64,iVBORw0KGgo...` | Decoded in the napplet shim — zero shell round-trip |
| `https:` | `https://example.com/avatar.png` | Shell-side network fetch under policy (private-IP block at DNS time, MIME byte-sniffing, size cap, timeout, rate limit, redirect cap) |
| `blossom:sha256:<hex>` | `blossom:sha256:e3b0c44...` | Blossom hash → bytes; shell verifies hash before delivery |
| `nostr:<bech32>` | `nostr:nprofile1...` | Single-hop NIP-19 resolution against the shell's relay pool |

**Cancellation:** Pass an `AbortSignal` to cancel an in-flight fetch:

```ts
const ctrl = new AbortController();
const promise = window.napplet.resource.bytes(url, { signal: ctrl.signal });
ctrl.abort();   // sends resource.cancel to the shell; promise rejects with AbortError
```

**Errors:** The Promise rejects with an Error whose `code` is one of:
`not-found`, `blocked-by-policy`, `timeout`, `too-large`, `unsupported-scheme`, `decode-failed`, `network-error`, `quota-exceeded`.

Always branch on `code`, never on the `error` string.

**Capability detection:**

```ts
if (window.napplet.shell.supports('nap:resource')) {
  // resource.bytes(url) is available
}
if (window.napplet.shell.supports('resource:scheme:blossom')) {
  // blossom: scheme is available specifically
}
if (window.napplet.shell.supports('perm:strict-csp')) {
  // shell enforces strict CSP — direct fetch / <img src=externalUrl> WILL be blocked
}
```

SVG inputs are silently rasterized server-side to PNG/WebP — napplets never receive `image/svg+xml` bytes (the shell rasterizes in a sandboxed Worker with no network access). The `mime` returned to the napplet is shell-classified via byte-sniffing, never the upstream `Content-Type` header.

## Step 11 — Two-class posture + user-gated direct network access (NAP-CLASS + NAP-CONNECT)

The shell is the sole runtime CSP authority and exposes two NAPs that together let a napplet explicitly request direct browser-level network access:

- **NAP-CLASS** — the shell sends a single `class.assigned` wire envelope at iframe-ready time. Napplets read the integer at `window.napplet.class` (`number | undefined`). Current track members: `class: 1` = **NAP-CLASS-1** (strict baseline; `connect-src 'none'`); `class: 2` = **NAP-CLASS-2** (user-approved explicit-origin; `connect-src <granted-origins>`).
- **NAP-CONNECT** — the napplet declares required origins at build time. The shell prompts the user at first load; on approval, the shell serves the napplet HTML with a runtime CSP whose `connect-src` contains the approved origins PLUS injects `<meta name="napplet-connect-granted">` for the shim to read synchronously. Napplets then read `window.napplet.connect` (`{ granted, origins }`).

### Default to NAP-RESOURCE; reach for NAP-CONNECT only when necessary

Default to NAP-RESOURCE for avatars, static assets, one-shot byte fetches, and bech32 resolution. Reach for NAP-CONNECT only when you need: POST/PUT/PATCH methods, WebSocket/SSE, custom headers, long-lived connections, streaming responses, or third-party libraries that call `fetch()` directly and aren't reasonable to refactor.

Declaring a `connect` origin is a tax (user-facing prompt, full trust vote) — earn it by needing what NAP-RESOURCE can't give you. The shell has zero browser-level hook to observe, filter, or rate-limit post-grant traffic between a napplet and an approved origin.

### Declaring origins at build time

Origins go in `vite.config.ts` via `@napplet/vite-plugin`'s `connect: string[]` option. The plugin normalizes + validates each origin (lowercases scheme + host, Punycodes non-ASCII, rejects wildcards, paths, default ports, etc.), emits one `["connect", "<origin>"]` manifest tag per origin, and folds the normalized origin set into `aggregateHash` via a synthetic `connect:origins` entry.

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { nip5aManifest } from '@napplet/vite-plugin';

export default defineConfig({
  plugins: [
    nip5aManifest({
      nappletType: 'my-napplet',
      connect: [
        'https://api.example.com',
        'wss://events.example.com',
        'https://xn--caf-dma.example.com',   // café.example.com in Punycode
      ],
    }),
  ],
});
```

Supply origins as human-readable strings; the plugin Punycodes IDN and validates at `configResolved`. Accept: `https:`, `wss:`, `http:`, `ws:`; non-default ports; IPv4 literals. Reject: uppercase host, wildcards (`*`), path/query/fragment, default ports (`:443` for `https`/`wss`, `:80` for `http`/`ws`), non-Punycode non-ASCII, IPv6 literals (v1 scope).

### Reading the runtime surface

```ts
import '@napplet/shim';

// Class — check shell.supports('nap:class') before branching on the integer.
if (window.napplet.shell.supports('nap:class')) {
  const cls = window.napplet.class;   // number | undefined
  if (cls === 2) {
    // NAP-CLASS-2 — user approved at least one connect origin this load.
  }
}

// Connect grant — window.napplet.connect is populated synchronously at shim install.
if (window.napplet.connect.granted) {
  const origins = window.napplet.connect.origins;   // readonly string[]
  const res = await fetch(`${origins[0]}/items`, { method: 'POST', body: '{}' });
} else {
  // Fall back to window.napplet.resource.bytes(url) for what the resource NAP can express.
}
```

`window.napplet.connect` MUST NEVER be `undefined` — it defaults to `{ granted: false, origins: [] }` on shells without `nap:connect`, on denied prompts, and pre-injection. This is the graceful-degradation guarantee.

### Cleartext / mixed-content warning

Browsers block `http:` and `ws:` fetches from napplets running in shells served over `https:`, regardless of the CSP header's `connect-src` value. A napplet declaring `http:` origins approved by the user will silently fail to fetch when the shell is served over `https:`, except for the `localhost` / `127.0.0.1` secure-context exceptions. The vite-plugin emits a build-time informational warning when `http:` or `ws:` origins appear in `connect`. Shells MAY refuse cleartext entirely — check `shell.supports('connect:scheme:http')` before relying on a cleartext grant:

```ts
if (window.napplet.connect.granted && window.napplet.shell.supports('connect:scheme:http')) {
  // Cleartext http: grants are honored in this shell.
}
```

Prefer `https:` and `wss:` origins end-to-end. Cleartext scheme declarations are accepted for operator-policy flexibility (localhost development, explicit opt-out-of-TLS deployments), not recommended as a default.

### Graceful degradation

Napplets SHOULD branch on four states, in priority order:

1. `shell.supports('nap:connect') === true` AND `window.napplet.connect.granted === true` -> use direct `fetch` / `WebSocket` / `EventSource` against `window.napplet.connect.origins`.
2. `shell.supports('nap:connect') === true` AND `window.napplet.connect.granted === false` -> user denied, prompt hasn't run, or shell chose not to grant. Fall back to NAP-RESOURCE; degrade affected features gracefully.
3. `shell.supports('nap:connect') === false` AND `shell.supports('nap:resource') === true` -> shell doesn't implement NAP-CONNECT at all. POST / WebSocket / SSE features are unavailable; MUST degrade gracefully.
4. Neither `nap:connect` nor `nap:resource` advertised -> napplet cannot reach the network at all. Display offline / read-only UX; no silent failures.

See [NAP-CONNECT](https://github.com/napplet/naps) and [NAP-CLASS](https://github.com/napplet/naps) for the normative specs.

## Step 12 — Track shell-user identity changes (NAP-IDENTITY)

Napplets can read the shell user's public key and subscribe to shell-pushed user changes. `getPublicKey()` always resolves: it returns a hex pubkey when a user/signer is connected, and `""` when no user is connected. Do not poll; shells push `identity.changed` whenever the value changes.

```ts
import '@napplet/shim';

const initialPubkey = await window.napplet.identity.getPublicKey();
setCurrentUser(initialPubkey);

const identitySub = window.napplet.identity.onChanged((pubkey) => {
  setCurrentUser(pubkey);
});

// Later:
identitySub.close();
```

**Capability detection.** Check for the identity NAP before depending on the identity namespace:

```ts
if (!window.napplet.shell.supports('nap:identity')) { /* no identity NAP */ }
```

## Step 13 — Verify conformance before publishing

Build the napplet, then run the conformance harness against it. It loads the build
into a real `sandbox="allow-scripts"` iframe, drives the protocol with a reference
shell, and fails on any malformed envelope, manifest problem, boot failure, or
forbidden-global reference — so you find protocol bugs locally instead of after
publishing into a runtime.

```jsonc
// package.json
{ "scripts": { "test:conformance": "napplet-conformance ./dist" } }
```

```bash
pnpm build
pnpm test:conformance        # exits non-zero on any error-severity failure
```

The bin is package-manager agnostic (`npx napplet-conformance ./dist` works under
npm / yarn / bun too). For an interactive, visual report you can also load the build
in the standalone conformance web runtime. CI: see `.github/workflows/conformance.yml`
for the headless pattern (cache Playwright's Chromium, then run the CLI).

## Runtime guard

Importing `@napplet/shim` arms a runtime guard. A napplet only works inside a
napplet runtime (shell) that proxies Nostr access over postMessage (NIP-5D). If
the build is opened without a runtime — as a top-level page, or embedded in a
frame that never answers the `shell.ready` → `shell.init` handshake (e.g. served
directly from a NIP-5A nsite gateway) — the shim renders an explanatory modal
and logs an error instead of silently failing. The modal links the visitor to a
runtime directory (`napplet.run`), the reference runtime (`github.com/kehto/web`),
and the NIP-5D spec. No setup is required; this ships with every napplet.

For local standalone development (no runtime), opt out before the shim loads with
either `window.__NAPPLET_ALLOW_STANDALONE__ = true` or a
`<meta name="napplet-allow-standalone">` tag in the document `<head>`.

## Common pitfalls

- Do not call `window.nostr` from napplet code. Use `window.napplet.*` APIs; NAP-IDENTITY is read-only and does not expose decrypt, encrypt, or signing operations.
- `nappletState` is scoped by version hash — clearing storage in one build version does not affect another build's stored data.
- Do not use `localStorage` directly — without `allow-same-origin` it will throw `SecurityError`. Use `nappletState` instead.
- `publish()` returns `Promise<NostrEvent>` — always `await` it. Errors surface as promise rejections (e.g., signer timeout, ACL denial).
- `query()` resolves after EOSE — it is a one-shot snapshot, not a live stream. Use `subscribe()` for live updates.
- `discoverServices()` results are session-cached. To refresh, the page must reload.
- `window.napplet.inc.emit()` does not return a value and does not confirm delivery. Use inter-napplet `window.napplet.inc.on()` subscriptions for acknowledgment patterns.
- The `on()` callback receives `(payload: unknown, event: NostrEvent)` — always type-check `payload` before accessing properties.
- **Do not call `fetch()`, `<img src="https://...">`, `<link href="https://...">`, `XMLHttpRequest`, or `new WebSocket(...)` from a napplet.** The iframe sandbox + strict CSP (`connect-src 'none'`, `img-src blob: data:`) block all of them at the browser level. Use `window.napplet.resource.bytes(url)` instead — it returns a `Blob` you can pass to `URL.createObjectURL()` for `<img src>` use.
- **Do not use the upstream `Content-Type` for resource MIME decisions.** The shell byte-sniffs the response and delivers a classified `mime` field on the result; the upstream `Content-Type` header is attacker-controlled and never reaches the napplet.
- **Inline scripts are forbidden.** `@napplet/vite-plugin` fails the build on any `<script>` element without a `src` attribute because the shell's baseline CSP is `script-src 'self'`. Move inline JS into a `.js` module and import it; inject state via `<script type="application/json">…</script>` data islands if you need build-time state passed to runtime code.
- **Do not assume `window.napplet.class` has a value at module top-level.** The shell sends `class.assigned` at iframe-ready time; the shim writes the integer after the envelope arrives. If your code runs before the dispatcher processes the envelope, `window.napplet.class` is `undefined`. Either gate on `shell.supports('nap:class')` AND defer (e.g., onto `requestAnimationFrame` / `queueMicrotask`), or treat `undefined` as "assume the most restrictive defaults the napplet can function under."
- **Cleartext `http:` / `ws:` origins silently fail from HTTPS shells.** Browsers enforce mixed-content below the CSP layer. A user-approved `http://api.example.com` grant from a napplet loaded via `https://shell.example.com` will produce no traffic, with no CSP violation event — the browser drops the request transparently. Prefer `https:` / `wss:`. Use cleartext only for localhost / `127.0.0.1` development or when the shell explicitly advertises `shell.supports('connect:scheme:http') === true`.
