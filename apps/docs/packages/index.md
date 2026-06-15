# Packages

The napplet SDK is a small set of focused, ESM-only packages. Most napplets use
**`@napplet/shim`** (required) plus **`@napplet/sdk`** (typed convenience), with
**`@napplet/vite-plugin`** as a dev dependency for manifest generation.

| Package | Description |
| --- | --- |
| [`@napplet/core`](./core) | JSON envelope types (`NappletMessage`, `NapDomain`), NAP dispatch infrastructure (`registerNap`, `dispatch`), protocol constants and Nostr types. Imported by all other packages. |
| [`@napplet/shim`](./shim) | Side-effect-only window installer. Importing it installs the `window.napplet` global and registers with the shell. Zero named exports. |
| [`@napplet/sdk`](./sdk) | Named TypeScript exports wrapping `window.napplet` for bundler consumers — `relay`, `inc`, `storage`, `keys`, and more, plus type re-exports. |
| [`@napplet/nap`](./nap) | All 16 NAP domains as layered subpath exports (barrel / types / shim / sdk per domain). Tree-shakable. |
| [`@napplet/vite-plugin`](./vite-plugin) | Vite plugin for NIP-5A manifest generation: per-file hashes, a signed kind 35128 event, and `requires` / `connect` / `config` meta tags at build time. |
| [`@napplet/boilerplate`](./boilerplate) | Interactive `npx` generator that clones the `github.com/napplet/boilerplate` template into a Vite + TypeScript starter. |

## Dependency graph

```
@napplet/shim ──┐
                ├──► @napplet/nap ──► @napplet/core
@napplet/sdk  ──┘

@napplet/vite-plugin  (build-time only, depends on nostr-tools)

@napplet/boilerplate  (CLI generator, clones github.com/napplet/boilerplate)
```

The iframe sandbox requires only `allow-scripts` — **no `allow-same-origin`**.
Napplets cannot access the host shell's DOM, cookies, `localStorage`, or service
workers; all persistent state goes through the shell's proxies.

> Every package is published to both [npm](https://www.npmjs.com/org/napplet) and
> [JSR](https://jsr.io/@napplet). Source lives at
> [github.com/napplet/napplet](https://github.com/napplet/napplet).
