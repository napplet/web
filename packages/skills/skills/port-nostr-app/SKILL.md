---
name: port-nostr-app
description: Use when converting an existing Nostr web app into a napplet - audit the app-owned relay, signing, storage, network, media, and routing layers; map each feature to the right NAP boundary; default social reads and publishes to NAP-OUTBOX, not NAP-RELAY; then hand a clean build spec to design-napplet/build-napplet.
---

# Porting A Nostr App To A Napplet

Use this before `design-napplet` when the starting point is an existing Nostr app. Do not copy the app architecture into the iframe. A napplet is sandboxed UI plus intent; the shell owns keys, signing, encryption, relay routing, storage, network bytes, and policy.

Protocol truth: NIP-5D (<https://github.com/nostr-protocol/nips/pull/2303>) plus NAPs (<https://github.com/napplet/naps>). Open the canonical spec before adding or depending on any message type, manifest tag, capability, or loading rule. If a needed surface is undefined, flag the gap instead of inventing it.

## Migration Rule

Replace app-owned infrastructure with the highest-level NAP that owns the user intent:

| Existing app code | Napplet boundary |
| --- | --- |
| Relay pools, NIP-65 outbox resolution, relay ranking, fanout, dedup, event validation | `outbox` |
| One explicit relay, group relay, raw relay diagnostics, protocol tooling outside the outbox model | `relay` |
| `window.nostr`, private keys, nostr-tools signing, NIP-07 assumptions | Shell-mediated publish/action NAPs (`outbox`, `common`, `lists`, `dm`) |
| Follow/unfollow/react/report/profile lookup/NIP-19 helpers | `common` |
| NIP-51/NIP-65 list read-modify-write | `lists` |
| Reaction/reply/repost/quote/report/follower counts | `count` |
| DM protocol, message storage, encryption, key sessions, relay routing | `dm` |
| `localStorage`, IndexedDB, cookies | `storage` |
| `fetch`, `XMLHttpRequest`, WebSocket, direct external images/media | `resource`, `upload`, `link`, `media`, or shell-owned NAPs |
| App-level cross-window/plugin bus | `inc` or `intent` |

If the port still contains a relay client, signer, direct storage layer, or direct network layer after this pass, assume the boundary is wrong until proven otherwise.

## Step 1 - Inventory The Existing App

Make a table before editing:

```
feature | existing code path | current direct authority | replacement NAP | hard/optional | notes
feed reads | RelayPool.subscribe + NIP-65 | relay routing | outbox | hard | author write relays matter
post note | signer.sign + relay.publish | signing + fanout | outbox.publish | hard | targetAuthors for directed posts
react | build kind 7 + signer + relay | social action | common.react | optional | fallback disables action
mute pubkey | edit kind 10000 | list mutation | lists.add | optional | preserve list state shell-side
avatar | fetch(url) | network bytes | resource.bytes | optional | object URL + revoke
```

Use this table as the design spec input. Do not start by wiring compatibility shims around the old app services.

## Step 2 - Split Monoliths Into Napplets

NIP-5D napplets should be small and focused. A full Nostr app usually becomes several napplets:

| App area | Likely napplet |
| --- | --- |
| Home/feed timeline | feed viewer |
| Composer | note composer |
| Profile page/editor | profile viewer/editor |
| Notifications | notification viewer |
| Direct messages | DM client |
| Relay/admin tools | relay diagnostic or relay manager |

Use `inc` or `intent` for handoff between napplets. Do not recreate the monolith with tabs unless the prompt explicitly asks for a single compound app and the shell context supports that shape.

## Step 3 - Rewrite Data Access

Default patterns:

```ts
import { outbox, common, lists, count, dm, storage, resource } from '@napplet/sdk';

const { events } = await outbox.query(
  [{ authors: [author], kinds: [1], limit: 20 }],
  { authors: [author], timeoutMs: 3000 },
);

const sub = outbox.subscribe([{ kinds: [1], authors: [author], limit: 50 }], {
  authors: [author],
  timeoutMs: 3000,
});
sub.on('event', (result) => render(result.event, result.sidecar?.relayHints));

const publish = await outbox.publish({
  kind: 1,
  content,
  tags,
  created_at: Math.floor(Date.now() / 1000),
});
if (!publish.ok) showPublishError(publish.error);

await common.react(noteId, '+');
await lists.add({ type: 'mute-list' }, [{ itemType: 'pubkey', value: pubkey }]);
const totals = await count.query({ kinds: [7], '#e': [noteId] });
await dm.send({ recipients: [pubkey], content: 'hello' });
```

Only keep `relay` when the inventory table says "explicit relay-local escape hatch" and names the reason.

## Step 4 - Remove Forbidden Surfaces

Search and delete or replace:

- `window.nostr`, private key material, `signEvent`, `nip04`, `nip44`, local encryption/session keys.
- `new WebSocket("wss://...")`, relay pool libraries, direct NIP-65 resolvers, app-owned fanout/dedup.
- `fetch`, `XMLHttpRequest`, direct `<img src="https://...">`, external scripts/styles.
- `localStorage`, `sessionStorage`, IndexedDB, cookies.
- Generic capability probes such as `discoverServices`, `hasService`, `shell.supports`.

Capability checks are property checks:

```ts
if (window.napplet?.outbox) loadFeed();
if (!window.napplet?.common) disableSocialActions();
```

## Step 5 - Hand Off To Build

Produce this handoff for `design-napplet` / `build-napplet`:

```
nappletType:
source app:
features kept:
features split/deferred:
NAPs used:
requires:
optional domains and fallbacks:
outbox reads:
outbox publishes:
social/list/count/dm actions:
relay escape hatches:
storage keys:
resource URLs/schemes:
removed app-owned infrastructure:
verification scenarios:
```

The stop condition for this skill is not "the old app compiles." It is "the napplet no longer owns authority that belongs to the shell, and every feature maps to a current NIP-5D/NAP/package surface."
