> Historical implementation context, non-normative. Protocol descriptions below may predate the current NIP-5D event schema. Read the actual `5D.md` at the head of [upstream PR 2303](https://github.com/nostr-protocol/nips/pull/2303/files) and the living [NAPs](https://github.com/napplet/naps) before implementing protocol behavior. NIP-5A aggregate-hash manifests and old registration handshakes are not current NIP-5D authority.

# External Integrations

**Analysis Date:** 2026-03-29

## Nostr Protocol Integration

**Nostr Wire Format (NIP-01):**
- All communication between shell and napplet uses NIP-01 (event/request/close messages) via `postMessage`
- Shell acts as a "pseudo-relay" (`PSEUDO_RELAY_URI = 'hyprgate://shell'`) that napplets connect to
- Napplet sends REQ/EVENT/CLOSE messages; shell routes to real relays, local cache, or inter-frame subscriptions

**Authentication (NIP-42):**
- Challenge-response handshake during napplet registration
- Ephemeral Ed25519 keypair generated per napplet session
- Shell verifies Schnorr signature from napplet
- Constants: `AUTH_KIND = 22242`, `PROTOCOL_VERSION = '2.0.0'`
- Implementation: `packages/shim/src/napp-keypair.ts`, `packages/shell/src/pseudo-relay.ts`

**NIP-5A Manifest:**
- Build-time manifest generation (kind 35128)
- Per-file SHA-256 hashes (x-tags) and aggregate hash
- Optional signature with `VITE_DEV_PRIVKEY_HEX`
- Implementation: `packages/vite-plugin/src/index.ts`

**Inter-Frame Events (NIP-29003):**
- Custom kind 29003 for napplet-to-napplet pub/sub via shell
- Topics tagged with 't' tag
- Enables napplets to communicate (profile open, stream channel switch, etc.)
- Implementation: `packages/shim/src/index.ts` (emit/on API)

**Signing Operations (NIP-07/NIP-46):**
- NIP-07 window.nostr proxy for event signing
- Napplet requests signing, shell proxies to host app's signer
- Supports NIP-04 (legacy encryption), NIP-44 (modern encryption)
- Shell enforces ACL before allowing sign operations

## Data Storage

**Local Cache:**
- WorkerRelayLike interface for local event cache (likely OPFS-backed)
- Shell provides `WorkerRelayHooks` for event storage and queries
- Implementation: `packages/shell/src/types.ts` (WorkerRelayHooks, WorkerRelayLike)

**Scoped Storage (nappStorage):**
- Per-napplet localStorage proxy scoped by `nappType:aggregateHash`
- 512 KB default quota per napplet (DEFAULT_STORAGE_QUOTA)
- Shell routes GET/SET/REMOVE/CLEAR operations via inter-frame messages
- Cannot read other napplets' storage; iframes cannot access shell's localStorage
- Implementation: `packages/shim/src/storage-shim.ts`, `packages/shell/src/storage-proxy.ts`

## Relay Pool Integration

**RelayPoolHooks Interface:**
- Host app provides relay pool connectivity
- Shell routes subscribe/publish to host's relay pool
- Methods: `getRelayPool()`, `trackSubscription()`, `selectRelayTier()`
- Supports scoped relay connections for NIP-29 groups
- Implementation: `packages/shell/src/types.ts`

**RelayConfigHooks Interface:**
- Add/remove relays by tier (discovery, super, outbox)
- Get relay configuration and NIP-66 suggestions
- Implementation: `packages/shell/src/types.ts`

## Window/Frame Management

**WindowManagerHooks Interface:**
- Host app creates iframes with options (title, class, iframe src)
- Shell tracks window lifecycle and routes messages to correct iframe
- Implementation: `packages/shell/src/types.ts`

## Authentication & Identity

**Auth Provider (Custom):**
- Host app provides current user pubkey via `AuthHooks.getUserPubkey()`
- Host app provides signer implementation via `AuthHooks.getSigner()`
- Shell proxies signing requests to host's signer
- Napplets get ephemeral keypairs; shell verifies signatures
- Implementation: `packages/shell/src/types.ts`

**Napp Key Registry:**
- Maps ephemeral napplet pubkeys to session metadata
- Tracks: pubkey, windowId, origin, type, dTag, aggregateHash, registeredAt
- Standalone utility accessible via `nappKeyRegistry` export
- Implementation: `packages/shell/src/napp-key-registry.ts`

## Access Control

**ACL Store:**
- Per-pubkey capability enforcement
- Capabilities: relay:read, relay:write, cache:read, cache:write, hotkey:forward, sign:event, sign:nip04, sign:nip44, storage:read, storage:write
- Can block pubkeys or throttle via storage quota
- Standalone utility accessible via `aclStore` export with `DEFAULT_STORAGE_QUOTA = 512 * 1024` bytes
- Implementation: `packages/shell/src/acl-store.ts`

**Consent Requests:**
- Destructive kinds (0, 3, 5, 10002) require explicit user consent
- Host app provides UI to approve/deny
- Shell raises `ConsentRequest` objects with `resolve(boolean)` callback
- Implementation: `packages/shell/src/types.ts`

## Crypto & Verification

**CryptoHooks Interface:**
- Host app provides event signature verification
- Shell verifies napplet-signed events before accepting
- Implementation: `packages/shell/src/types.ts`

## Audio Management

**AudioManager:**
- Standalone utility for audio playback/lifecycle
- Exported as `audioManager` from `@napplet/shell`
- Implementation: `packages/shell/src/audio-manager.ts`

## Manifest Caching

**ManifestCache:**
- Caches fetched NIP-5A manifest events
- Standalone utility exported as `manifestCache`
- Implementation: `packages/shell/src/manifest-cache.ts`

## Direct Messages (Optional)

**DmHooks Interface:**
- Optional hook for sending DMs via NIP-17 (gift-wrap)
- `sendDm(recipientPubkey, message)` returns {success, eventId?, error?}
- If not provided, DM functionality is disabled
- Implementation: `packages/shell/src/types.ts`

## Hotkey Forwarding

**HotkeyHooks Interface:**
- Napplets can request host to execute hotkeys
- Host app implements `executeHotkeyFromForward(event)` with key, code, modifiers
- Implementation: `packages/shell/src/types.ts`

## CI/CD & Deployment

**Hosting:**
- npm registry (packages not yet published; changesets ready at v0.1.0)

**CI Pipeline:**
- GitHub Actions (`.github/workflows/ci.yml`)
- Runs on: push to main, pull requests to main
- Steps: checkout, pnpm setup, Node 22 with pnpm cache, install, build, type-check, test
- Node version: 22 (specified in workflow)

## Environment Configuration

**Required env vars:**
- None required at runtime; packages are framework-agnostic

**Optional env vars:**
- `VITE_DEV_PRIVKEY_HEX` (build-time for `@napplet/vite-plugin`) - hex-encoded 32-byte private key for manifest signing
  - If not set, vite-plugin gracefully skips signing and writes unsigned manifest

**Secrets location:**
- Not applicable; protocol uses Nostr keys, not API secrets
- Signing keys managed by host app (via AuthHooks.getSigner())

## Message Bus Events

**Inter-Process Message Kinds:**
- 29000: REGISTRATION (napplet registration)
- 29001: SIGNER_REQUEST (napplet requests signing)
- 29002: SIGNER_RESPONSE (shell responds with signature)
- 29003: INTER_PANE (napplet-to-napplet events)
- 29004: HOTKEY_FORWARD (napplet requests hotkey execution)
- 29005: METADATA (shell metadata)
- 29006: NIPDB_REQUEST (napplet requests NIP-DB query)
- 29007: NIPDB_RESPONSE (shell responds with query results)

All sent via `postMessage` with NIP-01 event envelope.

## Framework Neutrality

**No Web Framework Dependency:**
- `@napplet/shim` has zero framework dependencies (API-only)
- `@napplet/shell` is framework-agnostic; host app provides hooks for relay, window manager, signer, etc.
- `@napplet/vite-plugin` is Vite-native but not tied to any UI framework
- Design allows napplets to use any framework (React, Vue, Svelte, vanilla, etc.)

---

*Integration audit: 2026-03-29*
