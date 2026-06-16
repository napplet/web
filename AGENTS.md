# AGENTS.md

This file is the source of truth for agents working in this repo. `CLAUDE.md` is a
symlink to it.

## Agent SDLC

Follow this lifecycle for **every** task. The goal: cohesive, shippable units of work —
no lost changes, no stray commits on the wrong branch, no drift between code, tests,
and docs.

### 0. Orient before you touch anything (dirty-state protocol)

Before the first edit, ALWAYS run `git status`, `git branch --show-current`, and
`git log --oneline -5`. Then:

- **Clean tree, on the default branch** → branch (step 1) and start.
- **Dirty tree or an unexpected branch** → STOP and understand it before doing anything
  else. Read the diff (`git diff`, `git diff --staged`), recent commits, and any
  `.planning/` artifacts to classify what you found:
  - **Interrupted / unfinished execution of a prior task** → finish it FIRST. Recover the
    intent, rectify it, complete it, and ship (or commit) it before starting the new
    prompt. Never pile new work on top of a half-done change or paper over it.
  - **Unrelated WIP that isn't yours** → do not absorb it into your work. Branch off,
    stage only your own files by path, and leave their changes untouched — or
    `git stash push -m "<why>" -- <paths>` and restore them when you're done.
- **Never discard work you didn't create.** No `git reset --hard`, `git checkout -- <path>`,
  branch deletion, or force-push over someone else's changes without explicit
  confirmation. When in doubt, stash (recoverable) rather than discard (gone).

### 1. Branch — never work on the default branch

One descriptive branch per concern, cut off an up-to-date default branch BEFORE the
first edit:

```bash
git checkout main && git pull --ff-only
git checkout -b <type>/<slug>     # feat/… fix/… chore/… release/…
```

If you discover you're already on `main` with uncommitted edits, branch immediately
(`git checkout -b …` carries the changes with you) before committing.

### 2. Pick the workflow by size

| Work                            | Entry point |
|---------------------------------|-------------|
| New feature set / version cycle | `/gsd:new-milestone` → optional `/gsd:discuss-phase` + `/gsd:plan-phase` → `/gsd:autonomous` → `/gsd:ship` |
| Single planned phase            | `/gsd:plan-phase` → `/gsd:execute-phase` → `/gsd:ship` |
| Small fix / doc / ad-hoc        | `/gsd:quick` |
| Investigation / bug             | `/gsd:debug` |

Use `/gsd:discuss-phase` and `/gsd:plan-phase` whenever the work is ambiguous or
multi-step; skip them for trivial changes. Prefer `/gsd:autonomous` for multi-phase
milestones so each phase runs discuss→plan→execute without per-step prompting.

### 3. Commit early and often

- Commit at every green checkpoint — a passing test, a finished sub-step. Many small
  atomic commits beat one big drop.
- Never carry a large uncommitted diff across steps or a context boundary. If you must
  pause, commit WIP (`wip: …`) or stash with a message — **uncommitted work is the only
  work that gets lost.**
- Conventional Commits (`feat(scope): …`). Credit the authoring agent with a
  `Co-Authored-By:` trailer.
- Stage by explicit path. Never `git add -A` / `-u` when unrelated changes are present.

### 4. No drift — code, tests, and docs move together

In the SAME branch/PR as the code change:

- **Tests**: update or add tests for every behavior you change; assert real vectors, not
  invented values. Keep `pnpm -r test:unit` green.
- **Docs**: update every README, `apps/docs/*`, and package doc that references what you
  changed. Grep for stale strings (versions, kinds, exports, option names) before
  committing: `grep -rn "<old>" --include=*.md --include=*.ts .`
- **AI-slop gate**: after each iteration, re-run the slop gate and restore it to passing
  (target 100/100) before shipping. `.aislop/config.yml` is pinned; a new rule disable
  needs a documented, justified reason. Re-assess it after later edits — not just once.

### 5. Definition of done = shipped, without being asked

"Done" is an open PR, not "code written." Run the whole chain yourself before reporting
back — **do not wait to be told to push or open a PR**:

1. `pnpm build` green
2. `pnpm type-check` green
3. `pnpm -r test:unit` green (tests updated per step 4)
4. docs / READMEs synced
5. AI-slop gate passing
6. atomic commits made
7. `git push -u origin <branch>`
8. `gh pr create` with a clear body: what, why, any surfaced decision, verification
   output, and out-of-scope notes.

`/gsd:ship` performs steps 6–8 (PR + review) inside a GSD flow. Outward-facing actions
(push, PR, publish) are authorized as the closing step of the task you were given — you
do not need a second prompt for them. Stage by path so the PR never sweeps in unrelated
dirty files left in the tree.

### 6. Releases (changesets)

Publishing runs from GitHub Actions on push to `main`; do not `pnpm publish-*` locally.

1. Add a changeset for each package whose **shipped output** changed. A test- or
   comment-only change ships nothing — do not bump it. On 0.x, a breaking change is a
   `minor` bump.
2. `pnpm version-packages` (bumps `package.json` + `jsr.json`, writes `CHANGELOG.md`,
   syncs JSR versions).
3. Commit, push, open the release PR. Merging to `main` runs the **Publish** (npm) and
   **Publish to JSR** workflows; `pnpm publish -r` skips already-published versions.

## Project Overview

This is the **napplet** monorepo — npm packages for the napplet protocol. Napplets are Nostr-native sandboxed iframe apps that communicate with a host shell over postMessage using a JSON envelope wire format defined by NIP-5D.

## Packages

- `packages/core` — **@napplet/core** — JSON envelope types, NAP dispatch, protocol constants
- `packages/shim` — **@napplet/shim** — Side-effect window installer (window.napplet)
- `packages/sdk` — **@napplet/sdk** — Named exports wrapping window.napplet for bundler consumers
- `packages/vite-plugin` — **@napplet/vite-plugin** — NIP-5A manifest generation at build time
- `packages/nap` — **@napplet/nap** — NAP domain subpaths (`@napplet/nap/relay`, `@napplet/nap/identity`, etc.)
- `packages/boilerplate` — **@napplet/boilerplate** — Interactive `npx` generator for the `github.com/napplet/boilerplate` template

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
