# CLAUDE.md

## Project Overview

This is the **napplet** monorepo — npm packages for the napplet protocol. Napplets are Nostr-native sandboxed iframe apps that communicate with a host shell over postMessage using a JSON envelope wire format defined by NIP-5D.

## Packages

- `packages/core` — **@napplet/core** — JSON envelope types, NAP dispatch, protocol constants
- `packages/shim` — **@napplet/shim** — Side-effect window installer (window.napplet)
- `packages/sdk` — **@napplet/sdk** — Named exports wrapping window.napplet for bundler consumers
- `packages/vite-plugin` — **@napplet/vite-plugin** — NIP-5A manifest generation at build time
- `packages/nap` — **@napplet/nap** — NAP domain subpaths (`@napplet/nap/relay`, `@napplet/nap/identity`, etc.)

## Tech Stack

- **TypeScript** (strict, ESM-only)
- **tsup** for building each package
- **turborepo** for monorepo orchestration
- **pnpm** workspaces
- **changesets** for versioning and publishing
- **nostr-tools** direct dependency (vite-plugin only)

## Key Concepts

- **JSON Envelope**: All messages use `{ type: "domain.action", ...payload }` format via postMessage. NIP-5D defines the envelope; NAP specs define message types per domain.
- **NAPs**: Napplet Unified Blueprints — modular interface specs (relay, identity, storage, inc, theme, keys, media, notify). Each NAP owns a message domain. Shells implement the NAPs they support.
- **Identity**: Shell identifies napplets via unforgeable `MessageEvent.source` at iframe creation. No handshake needed.
- **ACL**: Capabilities keyed on `(dTag, aggregateHash)`. Controls signing, storage, relay access.
- **Storage scoping**: Keys scoped by `dTag:aggregateHash` so different napplet types and versions have isolated storage.
- **Sandbox**: `allow-scripts` only — no `allow-same-origin`. Everything is proxied via the shell.
- **shell.supports()**: Napplets query `window.napplet.shell.supports('relay')` to check NAP availability.

## Build & Test

```bash
pnpm install
pnpm build          # Build all via turborepo
pnpm type-check     # TypeScript validation
```

## Publishing

Publishing runs from GitHub Actions, not from local `pnpm publish-*` commands.
Prepare release metadata locally, then push and let the npm + JSR workflows
publish from `main`:

```bash
pnpm version-packages
```

## Code Conventions

- ESM-only (no CJS output)
- Zero framework dependencies (no Svelte, React, etc.)
- All public API exports have JSDoc with @param, @returns, @example

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Napplet Protocol SDK**

A portable SDK for the napplet protocol — sandboxed Nostr mini-apps that run in restrictive iframes and delegate functionality (signing, storage, relay access) to a host shell via JSON envelope postMessage wire format defined by NIP-5D.

**Core Value:** Prove that sandboxed Nostr apps can securely delegate to a host shell over a simple, standardized protocol — and ship the spec + SDK so others can build on it.

### Constraints

- **ESM-only**: No CJS output — all packages are ESM
- **Zero framework deps**: No Svelte, React, Vue — framework-agnostic SDK
- **iframe sandbox**: `allow-scripts` only — no `allow-same-origin`, everything proxied via postMessage
- **Monorepo tooling**: pnpm workspaces + turborepo + tsup + changesets
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

- TypeScript 5.9.3 (strict, ESM-only, ES2022 target)
- tsup 8.5.0 for bundling
- turborepo 2.5.0 for monorepo orchestration
- pnpm 10.8.0 workspaces
- changesets 2.30.0 for versioning/publishing
- nostr-tools 2.23.3 (direct dependency for vite-plugin only)
- 13 packages at v0.2.0 (4 core + 9 NAP modules)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- TypeScript source files use lowercase with hyphens: `relay-shim.ts`, `envelope.ts`, `dispatch.ts`, `types.ts`, `keyboard-shim.ts`
- Type-specific suffix: `types.ts` for interface/type definitions
- Configuration files: `tsup.config.ts`, `turbo.json`, `tsconfig.json`
- Exported functions use camelCase: `subscribe()`, `publish()`, `query()`, `emit()`, `on()`, `registerNap()`, `dispatch()`
- Internal/private helper functions use camelCase with leading underscore when unexported: `sendEvent()`, `handleRelayMessage()`
- Initialization functions: `installStorageShim()`, `installKeyboardShim()`, `installNostrDb()`
- Getter functions: `getPublicKey()`, `getPublicKey()`, `getUserPubkey()`
- Factory function names: `createDispatch()` for main entry points
- camelCase for local variables and module-level state: `pendingRequests`, `keypair`, `eventBuffer`, `seenEventIds`
- UPPER_SNAKE_CASE for constants: `REQUEST_TIMEOUT_MS`, `RING_BUFFER_SIZE`, `DEFAULT_STORAGE_QUOTA`, `SIGNER_SUB_ID`
- Map/Set names: descriptive nouns without prefix, e.g., `subscriptions`, `pendingChallenges`, `sources`
- Private state uses underscore prefix if exported: `_setInterPaneEventSender()`, `_resolveKeypairReady`
- PascalCase for interfaces and types: `NostrEvent`, `NostrFilter`, `NappletMessage`, `NapDomain`, `ShellSupports`, `ThemeColors`
- Suffix conventions: `*Message` for envelope message types (e.g., `RelaySubscribeMessage`, `StorageGetMessage`)
## Code Style
- No explicit linter/formatter configured in package (ESLint/Prettier)
- TypeScript strict mode enabled: `strict: true` in `tsconfig.json`
- 2-space indentation observed throughout codebase
- No explicit line length limit enforced, but typical lines are <100 characters
- Semicolons required (TypeScript module convention)
- TypeScript strict mode enforced via `tsconfig.json` with `"strict": true`
- Module resolution: `"moduleResolution": "bundler"` for modern ESM bundlers
- No explicit ESLint config found; relying on TypeScript compiler checks
- Comments in code disallow implicit `any`: `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
## Import Organization
- No path aliases configured; all imports are explicit relative paths
- Monorepo packages imported via `@napplet/core`, `@napplet/shim`, `@napplet/sdk`, and `@napplet/nap` subpaths
- ESM-only: `verbatimModuleSyntax: true` in tsconfig enforces explicit `import type` for types
## Error Handling
- Silent catches for non-critical errors: `catch { /* intentional */ }` or `catch { /* best-effort */ }`
- Error fields in JSON envelope result messages: `{ error: 'reason' }`
- Promise rejection with descriptive Error objects: `reject(new Error('Signer request timed out'))`
- Try-catch around localStorage access: localStorage may be unavailable or throw
- Validation failures return early with explicit error responses (no exceptions thrown for validation)
- Prefixed error reasons: `'auth-required: ...'`, `'invalid: ...'`, `'duplicate: ...'`, `'quota exceeded: ...'`
- Storage errors: `'missing key tag'`, `'storage:read capability denied'`, `'storage write failed'`
## Logging
- `console.log()` for informational messages (build logs, manifest generation status)
- Plugin logging prefixed: `[nip5a-manifest]` in vite-plugin
- Intentional error swallowing with comments explaining why
- No dedicated logging library; output only during build or critical paths
## Comments
- File headers explaining module purpose (required for main modules)
- Section dividers using `// ─── Section Name ──────────────...` format
- JSDoc comments for public API functions
- Inline comments explaining non-obvious logic (protocol violations, special cases)
- Comments in catch blocks explaining why errors are ignored
- Required for all exported functions
- Format: `@param`, `@returns`, `@example` tags
- Example blocks using markdown triple-backticks
## Function Design
- Functions range from 5-100 lines
- Helper functions are typically 10-15 lines
- Main message handlers span 50-100 lines
- Prefer explicit parameters over object spreading
- Use single object parameter for optional settings: `options?: { relay?: string; group?: string }`
- Callback-based API: `onEvent`, `onEose`, `callback` patterns for subscription
- Functions return Promise for async operations: `Promise<NostrEvent>`, `Promise<unknown>`
- Subscription functions return objects with teardown methods: `{ close(): void }`
- Factory functions return interface types: `createDispatch(): NapDispatch`
- Early returns for validation failures: `if (!condition) return;`
## Module Design
- Prefer named exports: `export function subscribe()`, `export const audioManager = { ... }`
- Default exports only for config files (tsup.config.ts, etc.)
- Public API clearly delineated: `// ─── Public API exports ────...` comments
- Type exports with `export type` when appropriate
- `packages/core/src/index.ts` acts as main barrel export
- Re-exports all public interfaces, dispatch infrastructure, and protocol constants
- NAP domains each have their own barrel export at `packages/nap/src/*/index.ts`
## Module-Level State
- Local state managed within IIFE closures in factory functions
- Module-level Maps for registries: `const registry = new Map<Window, string>()`
- Explicit initialization and cleanup functions: `installStorageShim()`, `cleanup()`
- State persistence for ACL: `aclStore.persist()`, `aclStore.load()` with localStorage
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

- Framework-agnostic (no Svelte, React, Vue dependencies)
- JSON envelope wire format: `{ type: "domain.action", ...payload }` via postMessage
- Identity via unforgeable `MessageEvent.source` at iframe creation — no handshake
- Modular NAP architecture: each NAP owns a message domain (relay, identity, storage, inc, theme, keys, media, notify)
- Core dispatch: `registerNap(domain, handler)` routes messages by domain prefix
- ACL keyed on `(dTag, aggregateHash)` for per-napplet capability enforcement
- Storage scoped by `dTag:aggregateHash` — cross-napplet isolation enforced by shell
- iframe sandbox: `allow-scripts` only, no `allow-same-origin`
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
