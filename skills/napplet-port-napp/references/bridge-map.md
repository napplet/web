# NAPP bridge migration decisions

Non-normative guidance. Read the source app and current [NAPP.md](https://github.com/eskema/nostrapps/blob/main/NAPP.md) / [napp-env.d.ts](https://github.com/eskema/nostrapps/blob/main/napp-env.d.ts) first. Follow the living target NAP linked for the behavior being implemented and the installed SDK's types for call syntax. Similar names do not establish equivalent contracts.

## Identity, signing and private data

| Source behavior | Target decision | Parity trap |
| --- | --- | --- |
| `nostr.getPublicKey()` | [IDENTITY](https://github.com/napplet/naps/blob/master/naps/NAP-IDENTITY.md) | Source may throw when signed out; target returns an empty string. Domain absence and signed-out state are separate. Watch `onChanged` and clear/requery account-sensitive state. |
| `nostr.signEvent()` then `utils.publish()` | [OUTBOX publish](https://github.com/napplet/naps/pull/32), or the fitting social action NAP | Send the unsigned template to the shell once; do not sign locally then publish again. Preserve content, tags, time and intended routing; remove source signature/id/pubkey assumptions where the shell owns them. A raw-signature-only workflow has no automatic equivalent. |
| `nostr.nip04` / `nostr.nip44` encrypt/decrypt for messaging | [DM](https://github.com/napplet/naps/pull/74) cleartext message operations | Rebuild around conversations/messages, not ciphertext event storage. Do not pass source ciphertext into a generic publish or retain encryption primitives. If the original feature is not messaging, check for an explicit matching contract and flag the gap if absent. |
| `utils.generateKey()` / `signWithKey()` | Determine the actual product need | A local secondary signing identity, key export, or arbitrary signing cannot be replaced with current-user publish. Flag an unsupported essential signing flow; never store secret keys in NAP-STORAGE. |
| `utils.verifyEvent()` | Runtime validation for mediated reads; pure validation of other untrusted inputs where needed | Signature verification has no signing authority. Preserve necessary validation without bundling an entire signer/relay package. |

Security authority: [NIP-5D Transport / Security Considerations](https://github.com/nostr-protocol/nips/pull/2303/files). Do not create a signer NAP or expose NIP-07 through a compatibility facade.

## Event store, relay reads and live updates

NAPP's `nostrdb` is a launcher-wide event store. OUTBOX is a relay-routing/query contract, not a promise of that database's full observable behavior. Before changing a store call, decide whether it reads cached data, starts network work, watches global store inserts, or mutates local-only state.

| Source | Target decision | Semantics to retain or flag |
| --- | --- | --- |
| `nostrdb.query(filters)` / `.event(id)` | [OUTBOX query/getEvent](https://github.com/napplet/naps/pull/32) where network-backed reads fit | Target reads can contact relays and return envelopes with event + sidecar. Unwrap the event before passing it to renderers; handle partial/incomplete results and errors. Offline cache completeness is not guaranteed. |
| `nostrdb.replaceable(kind, author, identifier?)` | Query by kind/author and, for addressable events, the identifier; select using the relevant Nostr replacement rules | Do not confuse missing identifier with an empty `d`, use the first relay arrival as newest, or lose identifier filtering. Query completeness matters; preserve deletion/replacement behavior required by the product. |
| `nostrdb.subscribe(filters)` async iterator | OUTBOX subscription if the purpose is live relay events | Rewrite `for await` to the SDK event handle and close it on disposal. No canonical promise that this observes every unrelated app's store insert/remove. Flag that dependency if essential. |
| `napp.sync(authors, kinds, range)` then DB reads | Bounded OUTBOX queries/subscriptions | Preserve per-author/per-kind limits, since/until semantics and pagination. A single aggregate `limit` may not match. No assumed shared coverage cache, `newEvents` counter, replay-on-query side effect or launcher concurrency policy. |
| `napp.outbox(filter, opts)` | OUTBOX subscription | Source uses EOSE callbacks then live callbacks and stores every event. Translate to documented target events, not invented `outbox.eose`. Separate initial data/loading policy from the live stream and handle overlap without duplicate rows. |
| `utils.subscribe(relays, filter, opts)` | [RELAY](https://github.com/napplet/naps/pull/2) for genuinely exact relay-local requirements | Preserve explicit relay intent, one/many filter handling, close semantics and errors. OUTBOX relay hints are not automatically equivalent to exactly those relays. Document the reason for RELAY; avoid source reconnect/routing machinery. |
| `nostrdb.add()` / `.remove()` | App-local in-memory state or [STORAGE](https://github.com/napplet/naps/pull/3) for local data, if that is the actual need | No generic NAP-DB mutation API is implied. Local removal is not a Nostr deletion event. Do not silently publish/delete network events to mimic local DB writes. Shared store mutation may be a gap. |
| `nostrdb.count(filters)` | [COUNT](https://github.com/napplet/naps/pull/69) for runtime-mediated counts, or count a known complete local result | Local cached count and relay-wide count differ. Preserve scope/exactness; an estimated count or a bounded result length cannot silently replace an exact total. |
| `utils.loadEvent(code, relays?, author?)` / `loadEvents(ids)` | Decode/validate the pointer, then OUTBOX getEvent/query | Handle hex IDs, `nostr:` URIs, nevent relay/author hints and naddr kind/author/identifier. An address cannot be fetched as an event ID. Preserve order/missing items expected by callers. |

Keep app-level view state and bounded UI reconciliation where needed. Shell routing/deduplication replaces relay infrastructure; it does not remove the need to sort a view, reconcile overlapping pages, or ignore a stale request after a filter change. Use the matching Nostr NIP for event-kind semantics rather than inferring those from either bridge.

## Profiles, list helpers, search and relay intelligence

| Source family | Candidate target | Decision |
| --- | --- | --- |
| `loadNostrUser`, profile lookup | [COMMON getProfile](https://github.com/napplet/naps/pull/67); IDENTITY for the shell user's own profile | Source `NostrUser` may be normalized/cached; inspect actual fields and convert deliberately. Handle malformed kind-0 JSON. Avatars still need resource mediation. |
| `loadFollowsList`, mutes, bookmarks, pins, relay lists, Blossom servers, emojis, badges, groups, podcast/media/git lists and addressable sets | Read public events through OUTBOX; IDENTITY only for operations it actually defines; [LISTS](https://github.com/napplet/naps/pull/68) for supported mutations | Inventory each helper used with its kind, tags, identifier, ordering, return shape and privacy. LISTS is not a universal `lists.get` API. Private list reads are not permission to decrypt locally. Preserve unknown fields/items during mutation by using the shell's semantic operation. |
| `fetch*WithSets` | Fetch referenced sets and reconcile in product code, using mediated reads | Retain expansion, ordering, missing-set and duplicate-item behavior. Do not mistake one root list event for the expanded result. |
| `fetchInstalledSlashCommands` | Inspect the actual command-definition behavior | No generic command installer/registry NAP follows from a source helper name. Reading public definitions may be possible; executing/installing them needs its own defined contract. |
| `searchUserLocal`, `searchUser`, `findAuthors` | Reuse a bounded known author set; use supported public-event search only where it matches | Follows-first ranking, NIP-05 resolution, cache-only mode and server search are different features. Do not invent `common.searchUser`. Name exact limits/fallbacks; use RESOURCE only if its method/scheme and policy cover the request. |
| `loadRelayList` for app-owned NIP-65 routing | OUTBOX owns routing; use its resolution operation only for a diagnostic UI | Do not rebuild relay pools by replaying the resolved plan. List editing remains a distinct LISTS feature. |
| `loadRelayInfo`, `relays.health(urls)` | Inspect relevant resource or NIP-66 query support | NIP-11 server information and NIP-66 monitor reports differ. No automatic target health helper is implied. Preserve source recency/status/RTT criteria with mediated data if feasible; otherwise flag missing behavior. |
| `napp.nip19.*`, `napp.fx.*` | Small bundled pure helpers or matching COMMON operation | Synchronous codecs/formatters are safe to keep local. If choosing async COMMON encode/decode, update every caller. Do not turn pure formatting into a required host capability without a reason. |

When migrating private list edits, preserve item visibility explicitly. Read the current LISTS operation rules: an omitted visibility on add defaults to public, while removal without a visibility selector can affect both public and private items. Use `visibility: 'private'` for the intended private mutation and test that the corresponding public item and unrelated encrypted entries survive. Check the runtime's supported list/item/privacy capabilities and failure results; never replace a failed semantic mutation with a whole-list overwrite or local decryption.

## Persistence and assets

[STORAGE](https://github.com/napplet/naps/pull/3) is async. Read its current Identity Scope and Instance Scope sections. Default shared state, per-instance state and memory-only state have different lifetimes. NAPP's per-origin `localStorage` and window-close erasure do not imply the same behavior in the target. Account-sensitive keys also need an explicit product policy; shell artifact isolation alone does not mean account isolation.

Instance isolation does not guarantee secure deletion on close: the current STORAGE proposal permits the shell to reclaim instance data, rather than promising erasure. If the source's close-window erasure is essential, prefer memory-only state when that satisfies the flow; otherwise identify the missing lifecycle guarantee. Do not present instance scope as proof that a privacy requirement is met.

Hydrate before the first write so default state cannot overwrite saved values. Validate JSON/schema, serialize writes where order matters, handle quota/denial, and retain unsaved input on failure. Do not promise persistence across artifact versions or access to the old launcher origin. For user data that must transfer, implement an explicit supported export/import path with validation and a tested round trip; never crawl another origin or silently discard it. If the source format cannot be exported with available tools, report that limitation.

| Source dependency | Port decision |
| --- | --- |
| Folder scripts/styles/fonts/images, dynamic chunks, JSON/ROM/WASM side files | Bundle immutable bytes into the self-contained artifact. Replace runtime paths with actual imported/inlined data. Check CSS, preload, dynamic import and WASM instantiation in the final output. |
| Blossom UI-kit bootstrap and `napp.ready` | Remove from the destination. Bundle replacements; do not race Blossom servers to install a launcher kit. |
| Remote pictures, media, fonts, `fetch`/XHR | [RESOURCE](https://github.com/napplet/naps/pull/80) where supported; validate response and render allowed local byte/object URLs. A URL from a profile/theme is data, not authority. Resource schemes/methods and target media policy need inspection; this is not an unrestricted HTTP proxy. |
| App uploads or NIP-96/Blossom auth | [UPLOAD](https://github.com/napplet/naps/pull/33); the shell owns auth/signing and transport |
| `utils.saveFile` | Use [FS](https://github.com/napplet/naps/pull/88) save picker + write if implemented; handle cancellation. |
| `utils.copyText` | Inspect current NAPs/SDK for an explicit supported clipboard contract. No automatic `clipboard` domain. Selectable text can be a disclosed fallback; it does not preserve an essential programmatic clipboard flow. |
| `napp.link` / external anchors | Use [LINK](https://github.com/napplet/naps/pull/53) for external navigation, INTENT for napplet handoffs. Do not use `window.open` or top navigation as a permission fallback. Distinguish denial from success. |
| `napp.log` | Local console diagnostics or an explicitly supported target facility. No invented launcher-log domain. Console output is not equivalent to a user-visible source audit log. |
| `napp.close`, `dev.installLocal` | Check a published shell/lifecycle/install contract and current host support. Do not invent `shell.close` or installer messages. Show an actionable limitation if the product depends on these; app publishing is a separate authorized workflow. |

## UI kit, themes and input

Inventory the controls actually used: buttons, tabs, forms, lists, disclosures, author views/pickers, icons and loading states. Replace each with local accessible HTML/components and CSS; preserve focus, keyboard navigation, labels, selection and event semantics. Author caches and pickers contain data-access logic too: replace `ui.authors` / `ui.authorPicker` data sources rather than only copying their visuals. Preserve safe text rendering; incoming metadata/event content does not become trusted HTML.

Use [THEME get/onChanged](https://github.com/napplet/naps/blob/master/naps/NAP-THEME.md) when available to update root backgrounds and component tokens. Map the actual NAPP variables used into product-local CSS variables; `--surface`, `--text` and `data-theme` are not injected target guarantees. Supply bundled/default system fonts and a local theme fallback. Theme font/background URLs require the same resource review as all other remote bytes.

For keyboard-bound actions, follow current [KEYS](https://github.com/napplet/naps/pull/9) and installed SDK guidance, preserving pointer controls when optional KEYS is absent. Source `napp.registerAction` is cross-app dispatch, not keyboard action registration. Ordinary text input stays ordinary text input. Dispose old bindings to prevent duplicate actions.
