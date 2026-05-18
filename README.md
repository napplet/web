> @napplet/nappllet **alpha**. The specification is experimental and a moving target. There will **most certainly be drift** between packages and the specification. Things will most **certainly change**. For adventurers only. 

# napplet

Monorepo for the **napplet** SDK -- libraries for building NIP-5D Nostr Web Applets - "napplets"

A **napplet** is a sandboxed web app that runs inside a **shell**. The shell and napplet communicate over `postMessage` using a JSON envelope format (`{ type, ...payload }`) defined by NIP-5D. The napplet never touches `localStorage`, relay connections, or signing keys directly -- the shell proxies everything through NUB interfaces.

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| [@napplet/core](packages/core) | `@napplet/core` | JSON envelope types (`NappletMessage`, `NubDomain`), NUB dispatch infrastructure (`registerNub`, `dispatch`), protocol constants and Nostr types. Imported by all other packages. |
| [@napplet/shim](packages/shim) | `@napplet/shim` | Side-effect-only window installer for napplet iframes. Importing `@napplet/shim` installs the `window.napplet` global and registers with the shell. Sends JSON envelope messages via postMessage. Zero named exports. |
| [@napplet/sdk](packages/sdk) | `@napplet/sdk` | Named TypeScript exports wrapping `window.napplet` for bundler consumers. Provides `relay`, `ifc`, `services`, `storage` objects plus NUB message type re-exports. |
| [@napplet/nub](packages/nub) | `@napplet/nub` | Consolidated NUB package. 10 domain subpaths (relay, storage, ifc, keys, theme, media, notify, identity, config, resource) with barrel + granular (types/shim/sdk) exports. Tree-shakable (`sideEffects: false`). Includes the v0.28.0 `resource` NUB for sandboxed byte fetching and the v0.29.0 `connect` + `class` NUBs for user-gated direct network access and shell-assigned security class. See [packages/nub/README.md](packages/nub/README.md) for the full subpath reference. |
| [@napplet/vite-plugin](packages/vite-plugin) | `@napplet/vite-plugin` | Vite plugin for NIP-5D manifest generation. Computes per-file SHA-256 hashes, signs a kind 35128 manifest event at build time, and injects `requires` meta tags. v0.29.0 ships a `connect?: string[]` option for user-gated direct-network origin declaration and a fail-loud inline-script diagnostic; the `strictCsp` option from v0.28.0 is `@deprecated` (accepts-but-warns) since the shell is now the sole runtime CSP authority. |

## Changelog

- **v0.30.0 — Class-Gated Decrypt Surface** — `identity.decrypt(event)` on NUB-IDENTITY: NIP-04 / NIP-44 / NIP-17 auto-detect decrypt returning `{ rumor, sender }` where `sender` is shell-authenticated. Gated shell-side to napplets assigned `class: 1` per NUB-CLASS-1 (strict baseline posture with `connect-src 'none'` — plaintext trapped inside the frame). See `packages/nub/README.md` and [NIP-5D §Security Considerations](specs/NIP-5D.md#security-considerations) for details.
- **v0.29.0 — NUB-CONNECT + Shell as CSP Authority** — shell-assigned class integer (`window.napplet.class`), user-gated direct-network origins via manifest `connect` tags (`window.napplet.connect`), shell as sole runtime CSP authority, `@napplet/vite-plugin` `strictCsp` option deprecated in favor of shell-emitted CSP.

## Architecture

### Package Dependency Graph

```
@napplet/shim ──┐
                ├──► @napplet/nub ──► @napplet/core
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
  ├── NUB dispatch (relay/signer/storage)    window.napplet.shell.supports(domain)
  └── IFC routing

◄────────── postMessage: { type: 'relay.subscribe', id, filters } ──────────►
◄────────── postMessage: { type: 'relay.event', subId, event }    ──────────►

@napplet/vite-plugin (build time)
  └── NIP-5D manifest generation + requires tag injection
```

The iframe sandbox requires only `allow-scripts` -- **no `allow-same-origin`**. Shells MAY add additional tokens (`allow-forms`, `allow-popups`, etc.) per shell policy. Napplets cannot access the host shell's DOM, cookies, localStorage, or service workers. All persistent state goes through the shell's proxies.

## Origin

The napplet protocol is documented in the [NIP-5D specification draft](specs/NIP-5D.md). Any shell can host napplets, and any web app can become a napplet by importing `@napplet/shim`.

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
