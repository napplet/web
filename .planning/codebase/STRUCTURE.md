> Historical implementation context, non-normative. Protocol descriptions below may predate the current NIP-5D event schema. Read the actual `5D.md` at the head of [upstream PR 2303](https://github.com/nostr-protocol/nips/pull/2303/files) and the living [NAPs](https://github.com/napplet/naps) before implementing protocol behavior. NIP-5A aggregate-hash manifests and old registration handshakes are not current NIP-5D authority.

# Codebase Structure

**Analysis Date:** 2026-03-29

## Directory Layout

```
napplet/                               # Root monorepo
├── packages/
│   ├── shim/                          # @napplet/shim — Napplet-side SDK
│   │   ├── src/
│   │   │   ├── index.ts               # Main entry point, exports public API
│   │   │   ├── types.ts               # Protocol constants, NostrEvent, NostrFilter
│   │   │   ├── relay-shim.ts          # subscribe(), publish(), query() implementation
│   │   │   ├── napp-keypair.ts        # Ephemeral keypair management
│   │   │   ├── storage-shim.ts        # nappStorage client proxy
│   │   │   ├── nipdb-shim.ts          # window.nostrdb NIP-DB proxy
│   │   │   ├── keyboard-shim.ts       # Keyboard forwarding when iframe focused
│   │   ├── dist/                      # Build output (tsup)
│   │   ├── package.json               # @napplet/shim metadata
│   │   ├── tsconfig.json              # TypeScript config (extends root)
│   │   └── tsup.config.ts             # ESM-only bundler config
│   │
│   ├── shell/                         # @napplet/shell — Shell runtime
│   │   ├── src/
│   │   │   ├── index.ts               # Exports createPseudoRelay, types, utilities
│   │   │   ├── types.ts               # Protocol constants, ShellHooks interface, Capability types
│   │   │   ├── pseudo-relay.ts        # Core NIP-01 router, AUTH handler, subscription lifecycle
│   │   │   ├── napp-key-registry.ts   # windowId ↔ pubkey mapping, aggregate hash updates
│   │   │   ├── origin-registry.ts     # origin URL → windowId mapping for spoofing prevention
│   │   │   ├── acl-store.ts           # Capability enforcement by pubkey:dTag:aggregateHash
│   │   │   ├── storage-proxy.ts       # Shell-side storage request handler
│   │   │   ├── manifest-cache.ts      # NIP-5A manifest (kind 35128) caching by dTag
│   │   │   ├── audio-manager.ts       # Web audio notification sound playback
│   │   │   ├── topics.ts              # Command topic constants for shell routing
│   │   ├── dist/                      # Build output (tsup)
│   │   ├── package.json               # @napplet/shell metadata
│   │   ├── tsconfig.json              # TypeScript config (extends root)
│   │   └── tsup.config.ts             # ESM-only bundler config
│   │
│   └── vite-plugin/                   # @napplet/vite-plugin — Build-time manifest generation
│       ├── src/
│       │   └── index.ts               # nip5aManifest() plugin factory
│       ├── dist/                      # Build output (tsup)
│       ├── package.json               # @napplet/vite-plugin metadata
│       ├── tsconfig.json              # TypeScript config (extends root)
│       └── tsup.config.ts             # ESM-only bundler config
│
├── .planning/
│   └── codebase/                      # GSD planning documents
│
├── .changeset/                        # changesets directory for versioning
├── .github/                           # GitHub CI/CD workflows
├── node_modules/                      # Monorepo root dependencies (pnpm)
├── package.json                       # Root workspace scripts
├── pnpm-workspace.yaml                # pnpm workspace definition
├── pnpm-lock.yaml                     # Lock file for reproducible installs
├── tsconfig.json                      # Root TypeScript config (shared by all packages)
├── turbo.json                         # Turborepo task pipeline
├── README.md                          # Project overview
└── CLAUDE.md                          # Project context and conventions
```

## Directory Purposes

**packages/shim:**
- Purpose: Napplet-side SDK for iframe applications
- Contains: Relay API, inter-frame pubsub, NIP-07 proxy, storage client, keypair management
- Key files: `index.ts` (public API), `relay-shim.ts` (subscribe/publish), `napp-keypair.ts` (session key)

**packages/shell:**
- Purpose: Shell runtime for hosting and managing napplet iframes
- Contains: NIP-01 pseudo-relay, AUTH handshake, ACL enforcement, registries, proxy handlers
- Key files: `index.ts` (exports), `pseudo-relay.ts` (core router), `types.ts` (ShellHooks interface)

**packages/vite-plugin:**
- Purpose: Vite build plugin for napplet manifests
- Contains: NIP-5A manifest generation, per-file hashing, manifest signing, meta tag injection
- Key files: `index.ts` (nip5aManifest plugin factory)

**.planning/codebase:**
- Purpose: GSD codebase analysis documents
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md (generated)

**.changeset:**
- Purpose: changesets directory for versioning and publishing
- Contains: .md files describing version bumps per package before publish

**.github:**
- Purpose: GitHub Actions CI/CD workflows
- Contains: Build, test, lint, publish workflows

## Key File Locations

**Entry Points:**
- `packages/shim/src/index.ts`: Napplet SDK entry. Runs on import; auto-initializes listeners and keypair
- `packages/shell/src/index.ts`: Shell runtime entry. Exports createPseudoRelay factory, types, utilities
- `packages/vite-plugin/src/index.ts`: Build plugin. Exports nip5aManifest(options) factory

**Configuration:**
- `tsconfig.json` (root): Shared TypeScript strict mode, ES2022 target, ESM, declaration generation
- `turbo.json`: Task pipeline (build → type-check, test depends on build)
- `pnpm-workspace.yaml`: Monorepo workspace declaration

**Core Logic:**
- `packages/shell/src/pseudo-relay.ts`: NIP-01 message dispatch, AUTH, subscription lifecycle, ACL checks, event delivery
- `packages/shim/src/relay-shim.ts`: Napplet-side subscribe/publish/query implementation
- `packages/shell/src/acl-store.ts`: Capability enforcement by composite key (pubkey:dTag:aggregateHash)
- `packages/shell/src/storage-proxy.ts`: Storage request handling and scoped localStorage management

**Type Definitions:**
- `packages/shim/src/types.ts`: BusKind constants, NostrEvent, NostrFilter, protocol constants
- `packages/shell/src/types.ts`: ShellHooks interface, Capability union type, all hook interfaces (RelayPoolHooks, AuthHooks, etc.)

**Registries:**
- `packages/shell/src/napp-key-registry.ts`: Bidirectional windowId ↔ pubkey + metadata (dTag, aggregateHash)
- `packages/shell/src/origin-registry.ts`: origin URL → windowId mapping for anti-spoofing
- `packages/shell/src/manifest-cache.ts`: NIP-5A manifest caching (dTag → manifest event)

## Naming Conventions

**Files:**
- `.ts` for all TypeScript source files
- `index.ts` for public package entry points
- `-shim.ts` suffix for proxy/shim implementations in @napplet/shim (e.g., `relay-shim.ts`, `storage-shim.ts`, `keyboard-shim.ts`)
- `-registry.ts` suffix for registry/mapping modules (e.g., `napp-key-registry.ts`, `origin-registry.ts`)
- `-store.ts` suffix for stateful data stores (e.g., `acl-store.ts`)
- `-proxy.ts` suffix for shell-side request handlers (e.g., `storage-proxy.ts`)
- `-manager.ts` suffix for resource managers (e.g., `audio-manager.ts`)
- `-cache.ts` suffix for cached data (e.g., `manifest-cache.ts`)

**Directories:**
- `src/` — TypeScript source files
- `dist/` — Built output (ESM + .d.ts + .map files)
- `packages/` — Individual npm packages in the monorepo
- `.planning/codebase/` — GSD analysis documents

**TypeScript Interfaces & Types:**
- `ShellHooks` — Main integration point interface (PascalCase, Hooks suffix)
- `RelayPoolHooks`, `AuthHooks`, `WindowManagerHooks`, etc. — Specialized hook interfaces
- `NostrEvent`, `NostrFilter` — NIP-01 types (PascalCase, descriptive names)
- `Capability` — String union type for permissions (lowercase, colon-separated: `'relay:read'`)
- `PseudoRelay`, `Subscription` — Public API interfaces

**Functions & Constants:**
- `createPseudoRelay()` — Factory function (camelCase)
- `handleMessage()`, `sendChallenge()`, `injectEvent()` — Pseudo-relay methods
- `subscribe()`, `publish()`, `query()` — Napplet API (camelCase, verb-first)
- `emit()`, `on()` — Inter-frame pubsub (camelCase, lowercase)
- `nappStorage` — Global storage proxy object (lowercase)
- `BusKind` — Constants object (PascalCase)
- `PSEUDO_RELAY_URI`, `PROTOCOL_VERSION`, `AUTH_KIND` — Constants (UPPER_SNAKE_CASE)

**Variables & State:**
- `subscriptions` — Map storing active relay subscriptions
- `pendingChallenges` — Map storing AUTH challenges in-flight
- `pendingRequests` — Map storing signer request correlations (napplet-side)
- `seenEventIds` — Ring buffer for replay attack prevention
- `byWindowId`, `byPubkey` — Dual-direction registry maps (napp-key-registry)

## Where to Add New Code

**New Feature in @napplet/shim (napplet SDK):**
- Primary code: `packages/shim/src/[feature-name].ts`
- Integration: Import and export from `packages/shim/src/index.ts`
- Example: Adding NIPDB query support → create `nipdb-shim.ts`, export `window.nostrdb` proxy from index

**New Feature in @napplet/shell (shell runtime):**
- Primary code: `packages/shell/src/[feature-name].ts`
- If it's a handler: Integrate into `packages/shell/src/pseudo-relay.ts` message dispatch switch
- If it's a registry: Create `[feature-name]-registry.ts`, export singleton from `packages/shell/src/index.ts`
- If it's a hook interface: Add to `packages/shell/src/types.ts` ShellHooks interface
- Example: Adding NIP-29 group relay support → create group registry, add GroupHooks to ShellHooks, integrate into pseudo-relay subscription logic

**New Vite Plugin Feature:**
- Primary code: Add logic to `packages/vite-plugin/src/index.ts` within the plugin return object
- Hooks: `configResolved()`, `transformIndexHtml()`, `closeBundle()`
- Example: Adding manifest encryption → modify closeBundle to encrypt before writing .nip5a-manifest.json

**Utilities (used across packages):**
- Shared helpers: Create in respective package `src/` as needed (ESM-only, no cross-package utilities library)
- Constants: Maintain in package-specific types.ts (protocol constants duplicated to avoid monorepo dependency)

**Tests:**
- Location: Co-located with source files as `*.test.ts` or `*.spec.ts` (not yet implemented; see TESTING.md)
- Example: `packages/shim/src/relay-shim.test.ts`

## Special Directories

**node_modules:**
- Purpose: Installed dependencies via pnpm
- Generated: Yes (via pnpm install)
- Committed: No (.gitignore)
- Structure: pnpm uses flat layout with hard links to ~/.pnpm-store

**.turbo:**
- Purpose: Turborepo cache directory
- Generated: Yes (created on first build)
- Committed: No (.gitignore)
- Structure: Stores build artifacts for incremental builds

**dist/ (per package):**
- Purpose: Build output from tsup
- Generated: Yes (on pnpm build)
- Committed: No (.gitignore)
- Structure: ESM .js + .d.ts declaration + .map sourcemaps
- Example: `packages/shim/dist/index.js`, `packages/shim/dist/index.d.ts`, `packages/shim/dist/index.js.map`

**.changeset:**
- Purpose: Version change tracking for changesets tool
- Generated: Manually created via `changeset add` or `changeset` CLI
- Committed: Yes (markdown files describing changes)
- Structure: `.md` files per pending change; applied via `changeset version` before publish

---

*Structure analysis: 2026-03-29*
