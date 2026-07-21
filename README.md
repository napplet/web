> @napplet/nappllet is **alpha**. The specification is experimental and a moving target. There **will most certainly be drift** between packages and the specification. Things **will most certainly change**. **For adventurers only.**

# napplet

[![CI](https://github.com/napplet/napplet/actions/workflows/ci.yml/badge.svg)](https://github.com/napplet/napplet/actions/workflows/ci.yml)
[![AI Slop Score](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fnapplet%2Fnapplet%2Fmain%2F.github%2Fbadges%2Faislop-score.json)](https://github.com/napplet/napplet/actions/workflows/ai-slop.yml)
[![Publish](https://github.com/napplet/napplet/actions/workflows/publish.yml/badge.svg)](https://github.com/napplet/napplet/actions/workflows/publish.yml)
[![Publish to JSR](https://github.com/napplet/napplet/actions/workflows/publish-jsr.yml/badge.svg)](https://github.com/napplet/napplet/actions/workflows/publish-jsr.yml)

Monorepo for the **napplet** SDK -- libraries for building NIP-5D Nostr Web Applets - "napplets"

A **napplet** is a sandboxed web app that runs inside a **shell**. The shell and napplet communicate over `postMessage` using a JSON envelope format (`{ type, ...payload }`) defined by NIP-5D. The napplet never touches `localStorage`, relay connections, or signing keys directly -- the shell proxies everything through NAP interfaces. [Read about napplets in NIP-5D possiblity](https://github.com/nostr-protocol/nips/pull/2303/changes)

## Packages

| Package | npm | JSR | Description |
|---------|-----|-----|-------------|
| [@napplet/cli](packages/cli) | _(pending)_ | _(pending)_ | CLI for the developer flow: initialize a minimal napplet, write `.napplet/napplet.json`, install the `build-napplet` agent skill, build, and hand off deployment to a configured provider command. CI builds standalone CLI binaries so developers do not need Deno or a repo checkout. |
| [@napplet/core](packages/core) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fcore?label=npm)](https://www.npmjs.com/package/@napplet/core) | [![JSR](https://jsr.io/badges/@napplet/core)](https://jsr.io/@napplet/core) | JSON envelope types (`NappletMessage`, `NapDomain`), NAP dispatch infrastructure (`registerNap`, `dispatch`), protocol constants and Nostr types. Imported by all other packages. |
| [@napplet/shim](packages/shim) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fshim?label=npm)](https://www.npmjs.com/package/@napplet/shim) | [![JSR](https://jsr.io/badges/@napplet/shim)](https://jsr.io/@napplet/shim) | Side-effect-only window installer for napplet iframes. Importing `@napplet/shim` installs the `window.napplet` global and registers with the shell. Sends JSON envelope messages via postMessage. Zero named exports. |
| [@napplet/sdk](packages/sdk) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fsdk?label=npm)](https://www.npmjs.com/package/@napplet/sdk) | [![JSR](https://jsr.io/badges/@napplet/sdk)](https://jsr.io/@napplet/sdk) | Named TypeScript exports wrapping `window.napplet` for bundler consumers. Provides `relay`, `ifc`, `services`, `storage` objects plus NAP message type re-exports. |
| [@napplet/nap](packages/nap) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fnap?label=npm)](https://www.npmjs.com/package/@napplet/nap) | [![JSR](https://jsr.io/badges/@napplet/nap)](https://jsr.io/@napplet/nap) | Consolidated NAP package. 10 domain subpaths (relay, storage, ifc, keys, theme, media, notify, identity, config, resource) with barrel + granular (types/shim/sdk) exports. Tree-shakable (`sideEffects: false`). Includes the v0.28.0 `resource` NAP for sandboxed byte fetching and the v0.29.0 `connect` + `class` NAPs for user-gated direct network access and shell-assigned security class. See [packages/nap/README.md](packages/nap/README.md) for the full subpath reference. |
| [@napplet/vite-plugin](packages/vite-plugin) | [![npm](https://img.shields.io/npm/v/%40napplet%2Fvite-plugin?label=npm)](https://www.npmjs.com/package/@napplet/vite-plugin) | [![JSR](https://jsr.io/badges/@napplet/vite-plugin)](https://jsr.io/@napplet/vite-plugin) | Vite plugin for NIP-5D manifest generation. Computes per-file SHA-256 hashes, signs a kind 35128 manifest event at build time, and injects `requires` meta tags. v0.29.0 ships a `connect?: string[]` option for user-gated direct-network origin declaration and a fail-loud inline-script diagnostic; the `strictCsp` option from v0.28.0 is `@deprecated` (accepts-but-warns) since the shell is now the sole runtime CSP authority. |

## Changelog

- **v0.30.0 — Class-Gated Decrypt Surface** — `identity.decrypt(event)` on NAP-IDENTITY: NIP-04 / NIP-44 / NIP-17 auto-detect decrypt returning `{ rumor, sender }` where `sender` is shell-authenticated. Gated shell-side to napplets assigned `class: 1` per NAP-CLASS-1 (strict baseline posture with `connect-src 'none'` — plaintext trapped inside the frame). See `packages/nap/README.md` and [NIP-5D §Security Considerations](specs/NIP-5D.md#security-considerations) for details.
- **v0.29.0 — NAP-CONNECT + Shell as CSP Authority** — shell-assigned class integer (`window.napplet.class`), user-gated direct-network origins via manifest `connect` tags (`window.napplet.connect`), shell as sole runtime CSP authority, `@napplet/vite-plugin` `strictCsp` option deprecated in favor of shell-emitted CSP.

## Architecture

### Package Dependency Graph

```
@napplet/shim ──┐
                ├──► @napplet/nap ──► @napplet/core
@napplet/sdk  ──┘

@napplet/vite-plugin  (build-time only, depends on nostr-tools)
```

### Napplet-Side Communication

```
Shell (any compatible shell)                @napplet/shim
  ShellBridge                                window.napplet.relay (subscribe/publish/query)
  ├── JSON envelope message routing          window.napplet.ifc   (emit/on)
  ├── Identity via message.source            window.napplet.storage (get/set/remove)
  ├── ACL enforcement                        window.napplet.resource (bytes/bytesAsObjectURL)
  ├── Class assignment (class.assigned)      window.napplet.connect  (granted/origins)
  ├── Connect grant injection (CSP + meta)   window.napplet.class    (shell-assigned integer)
  ├── NAP dispatch (relay/signer/storage)    window.napplet.shell.supports(domain)
  └── IFC routing

◄────────── postMessage: { type: 'relay.subscribe', id, filters } ──────────►
◄────────── postMessage: { type: 'relay.event', subId, event }    ──────────►

@napplet/vite-plugin (build time)
  └── NIP-5D manifest generation + requires tag injection
```

The iframe sandbox requires only `allow-scripts` -- **no `allow-same-origin`**. Shells MAY add additional tokens (`allow-forms`, `allow-popups`, etc.) per shell policy. Napplets cannot access the host shell's DOM, cookies, localStorage, or service workers. All persistent state goes through the shell's proxies.

## Origin

The napplet protocol is documented in the [NIP-5D specification draft](specs/NIP-5D.md). Any shell can host napplets, and any web app can become a napplet by importing `@napplet/shim`.

## Getting Started

Start with the CLI. It owns project initialization and deployment metadata so the boilerplate stays minimal and developers do not have to hand-copy the same title/type/class values through generated code.

```bash
pnpm add -g @napplet/cli
napplet init my-napplet
cd my-napplet
pnpm install
napplet doctor
napplet skills install
```

Then use the installed `build-napplet` agent skill to build app behavior in `src/`. The generated `.napplet/napplet.json` is the source of truth for:

- `name` and `title`
- NIP-5A `type`
- shell-assigned security `class`
- approved direct `connect` origins
- build and deploy commands

Build and deploy through the CLI:

```bash
napplet build
napplet deploy
```

`napplet deploy` builds first, then runs `.napplet/napplet.json` `deploy.command`. If no provider command is configured, it fails loudly after the build instead of pretending the napplet was published.

Already have a Vite app? Run `napplet configure` from the app root to create `.napplet/napplet.json`, then run `napplet doctor` to see what still needs to be wired into the CLI-owned flow.

## Development

```bash
pnpm install
pnpm build        # Build all packages via turborepo
pnpm type-check   # TypeScript validation
```

### Publishing

Uses [changesets](https://github.com/changesets/changesets) for versioning:

```bash
pnpm version-packages   # Apply changesets, bump versions
pnpm publish-packages   # Build + publish to npm
```

## Related

- **[NIP-5D](specs/NIP-5D.md)** -- Protocol specification for the napplet-shell protocol

## License

MIT
