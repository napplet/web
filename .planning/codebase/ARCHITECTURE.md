> Historical implementation context, non-normative. Protocol descriptions below may predate the current NIP-5D event schema. Read the actual `5D.md` at the head of [upstream PR 2303](https://github.com/nostr-protocol/nips/pull/2303/files) and the living [NAPs](https://github.com/napplet/naps) before implementing protocol behavior. NIP-5A aggregate-hash manifests and old registration handshakes are not current NIP-5D authority.

# Architecture

**Analysis Date:** 2026-03-29

## Pattern Overview

**Overall:** Client-server message-passing architecture using NIP-01 wire format over postMessage. The shell acts as a pseudo-relay server; napplets act as relay clients.

**Key Characteristics:**
- Framework-agnostic (no Svelte, React, Vue dependencies)
- Dependency injection pattern via `ShellHooks` interface for host integration
- postMessage-based bidirectional communication with NIP-01 wire format
- Session-scoped ephemeral keypairs per napplet for AUTH handshake
- Composite-keyed ACL system (pubkey:dTag:aggregateHash) for capability enforcement
- Storage and signing proxies enforce zero-access to localStorage, relay pools, or host signer keys

## Layers

**Napplet Layer (@napplet/shim):**
- Purpose: SDK for sandboxed iframe applications. Provides high-level relay API, NIP-07 proxy, inter-frame pubsub, storage proxy client
- Location: `packages/shim/src/`
- Contains: `subscribe`, `publish`, `query`, `emit`, `on`, `nappStorage` APIs; relay message shim; NIP-07/NIP-44 signer proxy; storage client; keyboard forwarding
- Depends on: nostr-tools (peer dependency) for event signing
- Used by: Napplet iframe applications running within a shell host

**Pseudo-relay Layer (@napplet/shell):**
- Purpose: NIP-01 message router and protocol handler. Core of the shell runtime. Handles AUTH, REQ, EVENT, CLOSE messages; routes to relay pool or local cache; enforces ACL
- Location: `packages/shell/src/pseudo-relay.ts`
- Contains: Message dispatch logic, subscription lifecycle, event delivery, ACL checks, replay attack prevention
- Depends on: All registries and proxy handlers in shell
- Used by: Shell host to attach to window.message listener

**Registries & State Management:**
- **NappKeyRegistry** (`packages/shell/src/napp-key-registry.ts`): Bidirectional mapping (windowId ↔ pubkey). Stores verified napp identity after AUTH handshake. Tracks pending aggregate hash updates.
- **OriginRegistry** (`packages/shell/src/origin-registry.ts`): Maps origin URL → windowId. Prevents origin spoofing during registration.
- **ACL Store** (`packages/shell/src/acl-store.ts`): Capability lookup by composite key `pubkey:dTag:aggregateHash`. Default permissive; explicitly blocks or revokes capabilities.

**Proxy Handlers:**
- **Storage Proxy** (`packages/shell/src/storage-proxy.ts`): Shell-side handler for napp storage requests. Intercepts kind 29001 events with topic "shell:storage-*"; stores in scoped localStorage; enforces quota.
- **Manifest Cache** (`packages/shell/src/manifest-cache.ts`): Caches NIP-5A manifest data (kind 35128 events) by dTag. Used to resolve aggregate hash on napp registration.

**Support Services:**
- **Audio Manager** (`packages/shell/src/audio-manager.ts`): Manages web audio context and plays notification sounds from ephemeral audio sources
- **Topics** (`packages/shell/src/topics.ts`): Command constants for shell inter-frame routing (e.g., `shell:storage-get`, `shell:relay-scoped-connect`)

**Build Plugin:**
- **Vite Plugin** (`packages/vite-plugin/src/index.ts`): Build-time manifest generation. Computes per-file SHA-256 hashes, aggregate hash, signs kind 35128 manifest event, injects meta tags into index.html

## Data Flow

**Napplet → Shell (publish):**

1. Napplet calls `publish(eventTemplate, relayUrls)` or emits via `emit(topic, tags, content)`
2. @napplet/shim signs event with session ephemeral keypair, posts `['EVENT', event]` to parent
3. Shell's pseudo-relay receives message, validates event signature
4. ACL check: does napplet pubkey:dTag:aggregateHash have `relay:write` capability?
5. Replay check: is event creation timestamp recent? Is event ID new?
6. Router decision: special topic (storage, inter-frame) → proxy handler; normal event → relay pool publish
7. Shell publishes to selected relay URLs or stores in local cache

**Shell → Napplet (subscribe/query):**

1. Napplet calls `subscribe(filters, onEvent, onEose)` with NIP-01 filter
2. @napplet/shim generates unique subId, posts `['REQ', subId, ...filters]` to parent
3. Shell's pseudo-relay creates subscription entry, queries relay pool or local cache
4. Shell ACL check: napplet pubkey:dTag:aggregateHash has `relay:read` capability?
5. Events matching filters are delivered via `['EVENT', subId, event]` postMessages
6. Shell signals `['EOSE', subId]` when stored events exhausted
7. Napplet unsubscribes via `sub.close()` → shell receives `['CLOSE', subId]`

**AUTH Handshake (NIP-42):**

1. Shell initiates: `sendChallenge(windowId)` → posts `['AUTH', challenge]` to napplet
2. Napplet receives, loads/creates session ephemeral keypair, signs kind 22242 AUTH event with tags: relay (pseudo-relay URI), challenge, type (nappType), version, aggregateHash
3. Napplet posts `['AUTH', authEvent]` back to shell
4. Shell verifies Schnorr signature, extracts pubkey, dTag (from manifest), aggregateHash
5. Shell registers in NappKeyRegistry, initializes ACL entry
6. Shell posts `['REQ', '__signer__', { kinds: [29002] }]` to enable signer response delivery

**Inter-frame Pubsub (topics):**

1. Napplet A calls `emit('profile:open', [], JSON.stringify({ pubkey: '...' }))`
2. @napplet/shim signs kind 29003 event with tag ['t', 'profile:open'], posts to shell
3. Shell routes to other napplets subscribed to kind 29003 with matching 't' tag via `on('profile:open', callback)`
4. Napplet B's callback fires with parsed payload

**Storage Access:**

1. Napplet calls `nappStorage.getItem(key)` or `setItem(key, value)`
2. @napplet/shim sends kind 29001 event with topic "shell:storage-get" or "shell:storage-set"
3. Shell proxy handler intercepts, looks up pubkey:dTag:aggregateHash, computes scoped key
4. Shell checks `storage:read` or `storage:write` ACL capability
5. Shell reads/writes to shell's localStorage at scoped key `napp-storage:${pubkey}:${dTag}:${aggregateHash}:${userKey}`
6. Shell returns response via inter-frame event

## Key Abstractions

**NappKeypair (ephemeral session key):**
- Purpose: Identifies a napplet instance for its session. Created on first AUTH challenge.
- Examples: `packages/shim/src/napp-keypair.ts`
- Pattern: Stored in sessionStorage; loaded/created deterministically per nappType; used to sign all outbound events

**ShellHooks (dependency injection interface):**
- Purpose: Framework-agnostic integration point. Host app provides relay pool, auth state, window manager, etc.
- Examples: `packages/shell/src/types.ts` (ShellHooks, RelayPoolHooks, AuthHooks, WindowManagerHooks, etc.)
- Pattern: createPseudoRelay(hooks) accepts all hooks; implementations are async-aware to allow real relay subscriptions

**Capability (permission model):**
- Purpose: Fine-grained access control per napplet version
- Examples: 'relay:read', 'relay:write', 'sign:event', 'sign:nip04', 'sign:nip44', 'storage:read', 'storage:write', 'hotkey:forward'
- Pattern: Checked on every sensitive operation (publish, subscribe, signer request, storage access)

**ConsentRequest (user approval flow):**
- Purpose: Gate destructive signing kinds (0: metadata, 3: contacts, 5: relay list, 10002: nip46 relay list)
- Examples: Raised when napplet attempts to sign kind 0, 3, 5, or 10002
- Pattern: Shell emits onConsentNeeded callback; host app displays prompt; user approves/denies

## Entry Points

**Shell Host Setup:**

1. Location: Host app (framework-specific, e.g., Svelte or React)
2. Triggers: App startup
3. Responsibilities:
   - Import `{ createPseudoRelay }` from @napplet/shell
   - Create ShellHooks object with relay pool, auth state, window manager
   - Call `const relay = createPseudoRelay(hooks)`
   - Attach handler: `window.addEventListener('message', relay.handleMessage)`
   - For iframes: call `relay.sendChallenge(windowId)` after iframe loads

**Napplet App Setup:**

1. Location: Napplet iframe (`packages/shim/src/index.ts` - runs on import)
2. Triggers: Napplet iframe load
3. Responsibilities:
   - Import @napplet/shim (automatically initializes on import)
   - Read nappType from `<meta name="hyprgate-napp-type">` tag
   - Load/create session keypair
   - Install window.nostr NIP-07 proxy
   - Attach message listener for relay responses
   - Ready to call `subscribe`, `publish`, `emit`, `on`, `nappStorage`

**Vite Build Integration:**

1. Location: Napplet's vite.config.ts
2. Triggers: `npm run build` or `vite build`
3. Responsibilities:
   - Import `{ nip5aManifest }` from @napplet/vite-plugin
   - Add plugin to vite config: `plugins: [nip5aManifest({ nappType: 'feed' })]`
   - Plugin injects `<meta name="hyprgate-aggregate-hash">` in dev
   - Plugin computes hashes and signs manifest in build (closeBundle hook)
   - Writes `.nip5a-manifest.json` to dist/

## Error Handling

**Strategy:** Event-level errors with correlation IDs. No exceptions thrown across postMessage boundary.

**Patterns:**

- **Signer Requests:** Napplet sends kind 29001 with unique ID, awaits kind 29002 response with matching id tag. Response includes error tag or result tag.
  - Example: `packages/shim/src/index.ts` sendSignerRequest → pendingRequests map with timeout

- **Storage Requests:** Napplet sends kind 29001 storage event, awaits kind 29001 response with id tag. Response includes error tag or value/found tags.
  - Example: `packages/shell/src/storage-proxy.ts` sendError → ['error', reason] tag

- **Relay Errors:** Shell sends NOTICE (NIP-01 server notice) or closes subscription via CLOSED verb.
  - Example: `packages/shim/src/relay-shim.ts` handleMessage switch on 'NOTICE', 'CLOSED'

- **Invalid Events:** Replay check returns error string. ACL denial is silent (event not delivered). Signature verification failure → drop event.
  - Example: `packages/shell/src/pseudo-relay.ts` checkReplay, checkAcl

## Cross-Cutting Concerns

**Logging:** Console.log only in build plugin at manifest generation time. Runtime logging is silent by default (host app can wrap pseudo-relay handlers).

**Validation:**
- Event signature verification via nostr-tools `verifyEvent` (shell crypto hook)
- Filter validation: NIP-01 filter schema (kinds, authors, ids, tags, limits)
- Storage key validation: Scoped prefix prevents cross-napp access

**Authentication:**
- NIP-42 AUTH challenge-response with Schnorr signature verification
- Ephemeral keypair per napplet instance (session-scoped)
- Aggregate hash resolution from manifest for version-specific ACL

**Isolation:**
- iframe sandbox without allow-same-origin prevents DOM/cookie access
- postMessage * origin (permissive in current impl; frame filtering could be added)
- Storage scoping by pubkey:dTag:aggregateHash prevents cross-napp data access
- No shared globals or prototype pollution

---

*Architecture analysis: 2026-03-29*
