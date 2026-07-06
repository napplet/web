---
name: build-napplet
description: Use when writing a napplet (sandboxed Nostr iframe app) - Vite setup, the NIP-5A manifest plugin, runtime-injected window.napplet, the @napplet/sdk API (OUTBOX-first event access, relay as explicit escape hatch, common social actions, lists, count, dm, scoped storage, read-only identity, inter-napplet events, sandboxed resource byte-fetching, config, theme, capability gating), and the single-file artifact rule. Pairs with design-napplet (plan first), port-nostr-app (for migrations), and test-napplet (verify before publish).
---

# Building a Napplet

Implements a `design-napplet` spec. A napplet is a single self-contained `/index.html` the shell loads into a `sandbox="allow-scripts"` iframe (no `allow-same-origin`); all host access is proxied over postMessage per NIP-5D. The napplet never holds keys. Protocol truth: NIP-5D (<https://github.com/nostr-protocol/nips/pull/2303>) + NAPs (<https://github.com/napplet/naps>). Never invent wire surface; flag gaps.

Use only domains and helpers shipped by the current packages. Current package
domains are `relay`, `identity`, `storage`, `inc`, `theme`, `keys`, `media`,
`notify`, `config`, `resource`, `cvm`, `outbox`, `upload`, `intent`, `ble`,
`webrtc`, `link`, `count`, `lists`, `serial`, `common`, and `dm`. Open NAP
proposals such as Blossom, hashtree, torrent, proof-of-work, system, or value
are not package APIs until the current packages export matching domains.

## Runtime Injection And SDK

The runtime injects `window.napplet` before napplet scripts run. Napplet code
does not import `@napplet/shim`; runtimes consume that package when they need the
first-party installer. Napplets import `@napplet/sdk` for named, typed wrappers,
or call `window.napplet.<domain>.*` directly.

Canonical pattern:

```ts
import { outbox, common, inc, storage, identity } from '@napplet/sdk';
```

Equivalently call `window.napplet.<domain>.*` directly (identical behavior). Examples below use whichever reads clearest; both hit the same runtime.

## Step 1 — Start From The Boilerplate

For a new napplet, scaffold with `@napplet/boilerplate` first. The generator
clones the canonical `github.com/napplet/boilerplate` template and preserves the
package manager pin, Vite config, single-file build plumbing, scripts,
conformance wiring, docs layout, and starter source structure.

```bash
npx @napplet/boilerplate ./my-napplet \
  --package-name my-napplet \
  --napplet-type my-napplet \
  --title "My Napplet" \
  --yes
```

Do not recreate `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, TypeScript
config, `index.html`, conformance scripts, or release/build plumbing inline.
Agents should edit the generated project, not replace its substrate.

Use the existing-app/manual path only when the user explicitly asks to retrofit
napplet support into a pre-existing app. In that case, mirror the boilerplate's
tooling shape instead of inventing a local one.

## Step 2 — Project-Specific Edit Points

After scaffolding, keep the boilerplate-owned files and make only the
project-specific edits the generator/template expects:

- `package.json`: package name only, plus dependencies only when the feature
  truly needs them.
- `vite.config.ts`: `nappletType`, hard `requires`, and optional config schema.
- `index.html`: title/root markup that the UI needs.
- `src/main.ts` and `src/styles.css`: application behavior and presentation.
- `README.md` and `docs/*`: project-specific usage, boundaries, and verification
  notes.

Preserve the template scripts unless the project has an explicit reason to
change them:

```jsonc
{
  "scripts": {
    "build": "vite build",
    "type-check": "tsc --noEmit",
    "verify": "pnpm type-check && pnpm build",
    "test:conformance": "pnpm build && napplet-conformance ./dist"
  }
}
```

## Step 3 — Configure the Vite plugin

The boilerplate already wires `nip5aManifest`. Update its project fields rather
than replacing the config. `nip5aManifest` hashes build output and writes the
NIP-5A manifest at build time, injecting a `<meta name="napplet-type">` tag the
runtime keys on. `nappletType` (the NIP-5D d-tag) is required.

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { nip5aManifest } from '@napplet/vite-plugin';

export default defineConfig({
  plugins: [
    nip5aManifest({
      nappletType: 'my-napplet',     // required — NIP-5D d-tag
      artifactMode: 'single-file',   // fold assets + keep inline scripts in one index.html
      // requires: ['outbox', 'storage'], // optional hard NAP domain requirements
      // configSchema: './config.schema.json', // optional NAP-CONFIG schema
    }),
  ],
});
```

The aggregate hash is computed into the manifest (`.nip5a-manifest.json`) and the signed event — it is **not** injected as a meta tag. Set `VITE_DEV_PRIVKEY_HEX` (hex 32-byte key) to produce a signed manifest in CI; dev builds work without it.

## Step 4 — Read And Publish Nostr Events Through Outbox First

Most napplets should use NAP-OUTBOX for Nostr event reads and publishes. The napplet supplies filters, event IDs, publish templates, and intent; the shell owns NIP-65 relay discovery, fallbacks, relay intelligence, deduplication, signature validation, signing, and fanout policy.

`outbox.query` is a one-shot read. `outbox.subscribe` is a live stream; call `sub.close()` to stop. Event returns are `RelayEventResult` records, so read the raw event at `result.event`.

```ts
import { outbox, identity } from '@napplet/sdk';

const me = await identity.getPublicKey();
if (!me) renderSignedOut();

const { events } = await outbox.query(
  [{ kinds: [1], authors: [me], limit: 20 }],
  { authors: [me], timeoutMs: 3000 },
);
for (const result of events) renderNote(result.event, result.sidecar?.relayHints);

const sub = outbox.subscribe(
  [{ kinds: [1], authors: [me], limit: 20 }],
  { authors: [me], timeoutMs: 3000 },
);
sub.on('event', (result) => renderNote(result.event, result.sidecar?.relayHints));
sub.on('closed', (reason) => markStreamClosed(reason));

sub.close(); // on teardown
```

Publish through `outbox.publish` for normal user-authored social/event output. The shell signs; the napplet never holds keys. Check `ok` because publish failures return structured results.

```ts
import { outbox } from '@napplet/sdk';

const result = await outbox.publish({
  kind: 1,
  content: 'Hello from a napplet!',
  tags: [],
  created_at: Math.floor(Date.now() / 1000),
});
if (!result.ok || !result.event) throw new Error(result.error ?? 'publish failed');
console.log('published', result.event.id);
```

For directed events, pass `targetAuthors` so the shell can include recipient inbox relays.

```ts
await outbox.publish(template, { targetAuthors: [recipientPubkey] });
```

## Step 5 — Use Higher-Level Social NAPs Before Raw Events

When a NAP owns the user intent, call that NAP instead of building and publishing raw events.

```ts
import { common, lists, count, dm } from '@napplet/sdk';

const profile = await common.getProfile('npub1...');
await common.react(noteId, '+');
await common.follow('npub1...');

await lists.add({ type: 'mute-list' }, [{ itemType: 'pubkey', value: pubkey }]);

const reactions = await count.query({ kinds: [7], '#e': [noteId] });

const status = await dm.status();
if (status.available) await dm.send({ recipients: [pubkey], content: 'hi' });
```

This keeps consent, read-modify-write merges, list preservation, encryption, signing, relay routing, and policy in the shell.

## Step 6 — Relay Is A Low-Level Escape Hatch

Use NAP-RELAY only when the feature needs relay-local semantics that OUTBOX and higher-level NAPs cannot express: a specific group relay, raw relay diagnostics, relay protocol tools, or a domain-specific protocol outside the outbox model.

```ts
import { relay } from '@napplet/sdk';

const sub = relay.subscribe(
  [{ kinds: [9, 10, 11, 12], limit: 50 }],
  (result) => renderGroupEvent(result.event),
  () => markCaughtUp(),
  { relay: 'wss://groups.example.com' },
);
sub.close();
```

Do not use `relay.publish` as the default social publish path. Prefer `outbox.publish`, `common`, `lists`, or `dm` unless the design spec names the exact relay escape hatch.

## Step 7 — Scoped storage

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

## Step 8 — Read-only identity

`getPublicKey()` always resolves: hex pubkey when a user is connected, `""` when not. Don't poll — subscribe to changes. Identity is strictly read-only (no sign/encrypt/decrypt).

```ts
import { identity } from '@napplet/sdk';

const me = await identity.getPublicKey();          // "" when signed out
const sub = identity.onChanged((pubkey) => {
  pubkey ? loadProfile(pubkey) : showSignedOut();
});
sub.close();
```

Also available: `getProfile()`, `getFollows()`, `getList(type)`, `getRelays()`, `getMutes()`, `getBlocked()`, `getBadges()`, `getZaps()`. Use `common` for profile lookup and social actions when available; `identity` is for the current shell user snapshot.

## Step 9 — Inter-napplet events

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

## Step 10 — Domain availability

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

## Step 11 — Fetch external bytes (resource NAP)

The sandboxed napplet model does not give app code ambient network authority.
Route every external byte through `resource` instead of `fetch`,
`<img src=https://…>`, `XMLHttpRequest`, or `WebSocket`.

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

## Step 12 — Config & theme (optional)

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

## Boilerplate Validation

Before claiming done on a generated napplet, run the template's own commands
from the generated project directory:

```bash
pnpm install
pnpm verify
pnpm test:conformance
```

If the user intentionally starts from an existing app instead of the
boilerplate, add equivalent scripts that match the boilerplate contract and run
those exact commands before completion.

## Common pitfalls

- Recreating the boilerplate by hand — **wrong substrate.** Start from
  `@napplet/boilerplate` for new napplets and preserve its scripts/config/layout.
- Napplet-owned `@napplet/shim` bootstrap — **wrong layer.** The runtime injects `window.napplet`; napplets use `@napplet/sdk` or direct domain properties.
- Treating open NAP proposals as shipped package APIs — **wrong surface.** If the current packages do not export the domain/helper, use an existing shipped NAP that faithfully owns the intent or flag the gap.
- No `discoverServices`/`hasService`/`hasServiceVersion` — use injected domain property presence.
- Treating NAP-RELAY as the default data layer — **wrong default.** Use `outbox` for normal event reads/publishes, `common` for social actions, `lists` for list mutations, `count` for counts, and `dm` for messages. Use `relay` only when the spec names a relay-local escape hatch.
- Storage is `nappletStorage`-backed via `storage.*` — there is no `nappletState`/`nappStorage`/`nappState` import.
- Never `localStorage`/`fetch`/`<img src=externalUrl>`/`WebSocket` — the sandboxed napplet model delegates that authority to the shell. Use `storage` and `resource`.
- Never call `window.nostr` — it isn't installed. Sign/publish via `outbox.publish` or higher-level NAPs; identity is read-only.
- `publish()`/`query()` are async — `await` them; errors surface as structured results or rejections depending on the domain.
- `outbox.query()` is one-shot; `outbox.subscribe()` is the live stream.
- **JS must be inline.** A napplet is one `srcdoc` `index.html` with an opaque origin — an external `<script src>` has nothing to fetch. `artifactMode: 'single-file'` folds assets and keeps inline scripts.
- Don't trust upstream `Content-Type` for resource MIME; the shell delivers a byte-sniffed `mime`.
