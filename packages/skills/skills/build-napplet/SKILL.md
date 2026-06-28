---
name: build-napplet
description: Use when writing a napplet (sandboxed Nostr iframe app) — Vite setup, the NIP-5A manifest plugin, runtime-injected window.napplet, the @napplet/sdk API (relay subscribe/publish/query, scoped storage, read-only identity, inter-napplet events, sandboxed resource byte-fetching, config, theme, capability gating), and the single-file artifact rule. Pairs with design-napplet (plan first) and test-napplet (verify before publish).
---

# Building a Napplet

Implements a `design-napplet` spec. A napplet is a single self-contained `/index.html` the shell loads into a `sandbox="allow-scripts"` iframe (no `allow-same-origin`); all host access is proxied over postMessage per NIP-5D. The napplet never holds keys. Protocol truth: NIP-5D (<https://github.com/nostr-protocol/nips/pull/2303>) + NAPs (<https://github.com/napplet/naps>). Never invent wire surface; flag gaps.

## Runtime Injection And SDK

The runtime injects `window.napplet` before napplet scripts run. Napplet code
does not import `@napplet/shim`; runtimes consume that package when they need the
first-party installer. Napplets import `@napplet/sdk` for named, typed wrappers,
or call `window.napplet.<domain>.*` directly.

Canonical pattern:

```ts
import { relay, inc, storage, identity } from '@napplet/sdk';
```

Equivalently call `window.napplet.<domain>.*` directly (identical behavior). Examples below use whichever reads clearest; both hit the same runtime.

## Step 1 — Install

```bash
pnpm add @napplet/sdk
pnpm add -D @napplet/vite-plugin
```

## Step 2 — Configure the Vite plugin

`nip5aManifest` hashes build output and writes the NIP-5A manifest at build time, injecting a `<meta name="napplet-type">` tag the runtime keys on. `nappletType` (the NIP-5D d-tag) is required.

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { nip5aManifest } from '@napplet/vite-plugin';

export default defineConfig({
  plugins: [
    nip5aManifest({
      nappletType: 'my-napplet',     // required — NIP-5D d-tag
      artifactMode: 'single-file',   // fold assets + keep inline scripts in one index.html
      // requires: ['signer'],       // optional hard service deps → napplet-requires meta
      // configSchema: './config.schema.json', // optional NAP-CONFIG schema
    }),
  ],
});
```

The aggregate hash is computed into the manifest (`.nip5a-manifest.json`) and the signed event — it is **not** injected as a meta tag. Set `VITE_DEV_PRIVKEY_HEX` (hex 32-byte key) to produce a signed manifest in CI; dev builds work without it.

## Step 3 — Subscribe to relay events

`subscribe` is a live stream; call `sub.close()` to stop. Signature: `subscribe(filters, onEvent, onEose, options?)`.

```ts
import { relay } from '@napplet/sdk';
import type { NostrEvent } from '@napplet/core';

const me = await window.napplet.identity.getPublicKey();

const sub = relay.subscribe(
  { kinds: [1], authors: [me], limit: 20 },
  (event: NostrEvent) => console.log('note:', event.content),
  () => console.log('EOSE — stored events loaded'),
);

sub.close(); // on teardown
```

## Step 4 — Publish an event

The shell signs; the napplet never holds keys. Always `await`.

```ts
import { relay } from '@napplet/sdk';

const signed = await relay.publish({
  kind: 1,
  content: 'Hello from a napplet!',
  tags: [],
  created_at: Math.floor(Date.now() / 1000),
});
console.log('published', signed.id);
```

Encrypted DMs: `relay.publishEncrypted(template, recipientPubkey, 'nip44')` (NIP-44 default).

## Step 5 — Query a snapshot

`query` resolves once after EOSE — a one-shot, not a stream. Use `subscribe` for live data.

```ts
import { relay } from '@napplet/sdk';
const events = await relay.query({ kinds: [1], limit: 50 });
```

## Step 6 — Scoped storage

Storage is async, proxied through the shell, scoped per napplet (512 KB quota). Never touch `localStorage` (throws `SecurityError` without `allow-same-origin`).

```ts
import { storage } from '@napplet/sdk';

await storage.setItem('settings', JSON.stringify({ theme: 'dark' }));
const raw = await storage.getItem('settings');     // string | null
const settings = raw ? JSON.parse(raw) : {};
await storage.removeItem('settings');
const keys = await storage.keys();                 // string[]
```

`storage.instance.*` exposes the same surface scoped to this napplet **instance** (per NAP-STORAGE) when you need per-placement state.

## Step 7 — Read-only identity

`getPublicKey()` always resolves: hex pubkey when a user is connected, `""` when not. Don't poll — subscribe to changes. Identity is strictly read-only (no sign/encrypt/decrypt).

```ts
import { identity } from '@napplet/sdk';

const me = await identity.getPublicKey();          // "" when signed out
const sub = identity.onChanged((pubkey) => {
  pubkey ? loadProfile(pubkey) : showSignedOut();
});
sub.close();
```

Also available: `getProfile()`, `getFollows()`, `getList(type)`, `getRelays()`, `getMutes()`, `getBlocked()`, `getBadges()`, `getZaps()`.

## Step 8 — Inter-napplet events

`inc.emit` broadcasts to topic subscribers; `inc.on` subscribes. `emit(topic, extraTags?, content?)` returns nothing and does not confirm delivery.

```ts
import { inc } from '@napplet/sdk';

inc.emit('profile:open', [], JSON.stringify({ pubkey: '3bf0c63…' }));

const sub = inc.on('profile:open', (payload: unknown, event) => {
  const { pubkey } = payload as { pubkey: string };
});
sub.close();
```

Always type-check `payload` (it is `unknown`).

## Step 9 — Domain availability

There is **no** `discoverServices()`/`hasService()` and no generic shell
capability query. NIP-5D runtimes inject `window.napplet` before napplet code
runs. Available domains are present as properties; unavailable domains are
absent.

```ts
if (window.napplet?.resource) { /* resource NAP available */ }
if (window.napplet?.inc) { /* inter-napplet events available */ }
if (!window.napplet?.upload) { /* render fallback */ }
```

Gate every domain-specific call behind property presence unless the domain is a
hard manifest requirement and the shell already refused incompatible loads.

## Step 10 — Fetch external bytes (resource NAP)

The sandbox + strict CSP (`connect-src 'none'`, `img-src blob: data:`) block `fetch`, `<img src=https://…>`, `XMLHttpRequest`, and `WebSocket` at the browser level. Route every external byte through `resource`.

```ts
const blob = await window.napplet.resource.bytes('https://example.com/avatar.png');
imgEl.src = URL.createObjectURL(blob);             // revokeObjectURL when done

const handle = window.napplet.resource.bytesAsObjectURL(
  'blossom:sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
);
imgEl.src = handle.url; // resolves once fetched
handle.revoke();        // when done
```

Schemes: `data:` (decoded in-shim, no round-trip), `https:` (shell network under policy), `blossom:sha256:<hex>` (hash-verified), `nostr:<bech32>` (single-hop NIP-19). Cancel with `bytes(url, { signal })`. Rejections carry a `code` — branch on it, never the message string:
`not-found`, `blocked-by-policy`, `timeout`, `too-large`, `unsupported-scheme`, `decode-failed`, `network-error`, `quota-exceeded`.

The shell byte-sniffs and classifies the MIME; never trust the upstream `Content-Type`. SVG inputs are rasterized server-side — napplets never receive `image/svg+xml`.

## Step 11 — Config & theme (optional)

```ts
const cfg = await window.napplet.config.get();                 // validated + defaulted snapshot
const cfgSub = window.napplet.config.subscribe((v) => apply(v)); // live updates
window.napplet.config.openSettings({ section: 'appearance' });  // deep-link shell settings UI

const theme = await window.napplet.theme.get();
const themeSub = window.napplet.theme.onChanged((t) => paint(t));
```

Declare config schema via the vite-plugin (`configSchema`) so the shell renders settings. Gate both behind `window.napplet?.config` / `window.napplet?.theme`.

## Runtime guard & standalone dev

Runtime injection belongs to the shell. Napplet application code should consume
the injected `window.napplet` namespace or typed helpers from `@napplet/sdk`;
do not add napplet-owned bootstrap plumbing.

## Common pitfalls

- Napplet-owned `@napplet/shim` bootstrap — **wrong layer.** The runtime injects `window.napplet`; napplets use `@napplet/sdk` or direct domain properties.
- No `discoverServices`/`hasService`/`hasServiceVersion` — use injected domain property presence.
- Storage is `nappletStorage`-backed via `storage.*` — there is no `nappletState`/`nappStorage`/`nappState` import.
- Never `localStorage`/`fetch`/`<img src=externalUrl>`/`WebSocket` — sandbox + CSP block them. Use `storage` and `resource`.
- Never call `window.nostr` — it isn't installed. Sign via `relay.publish`; identity is read-only.
- `publish()`/`query()` are async — `await` them; errors surface as rejections (signer timeout, ACL denial).
- `query()` is one-shot (resolves after EOSE); `subscribe()` is the live stream.
- **JS must be inline.** A napplet is one `srcdoc` `index.html` with an opaque origin — an external `<script src>` has nothing to fetch. `artifactMode: 'single-file'` folds assets and keeps inline scripts.
- Don't trust upstream `Content-Type` for resource MIME; the shell delivers a byte-sniffed `mime`.
