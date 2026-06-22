# Packages

The napplet SDK is a small set of focused, ESM-only packages. Most napplets use
**`@napplet/shim`** (required) plus **`@napplet/sdk`** (typed convenience), with
**`@napplet/vite-plugin`** as a dev dependency for manifest generation.

| Package | Description |
| --- | --- |
| [`@napplet/core`](./core) | JSON envelope types (`NappletMessage`, `NapDomain`), NAP dispatch infrastructure (`registerNap`, `dispatch`), protocol constants and Nostr types. Imported by all other packages. |
| [`@napplet/shim`](./shim) | Side-effect-only window installer. Importing it installs the `window.napplet` global and registers with the shell. Zero named exports. |
| [`@napplet/sdk`](./sdk) | Named TypeScript exports wrapping `window.napplet` for bundler consumers — `relay`, `inc`, `storage`, `keys`, and more, plus type re-exports. |
| [`@napplet/nap`](./nap) | All 19 active domain subpaths as layered exports (barrel / types / shim / sdk per active NAP domain, plus shell/ifc compatibility). Tree-shakable. |
| [`@napplet/vite-plugin`](./vite-plugin) | Vite plugin for napplet manifest generation: per-file `path` hashes, a signed NIP-5D kind 35129 event (NIP-5A tag schema), and `requires` / `connect` / `config` tags at build time. |
| [`@napplet/conformance`](./conformance) | Framework-agnostic protocol conformance engine — reference mock shell, per-NAP envelope validators, manifest validator, and reporters. A dev/test tool, not loaded in the sandbox. |
| [`@napplet/conformance-cli`](./conformance-cli) | The headless `napplet-conformance` runner — drives the conformance engine against a napplet in real Chromium via Playwright. Wire it up as `test:conformance`. |
| [`@napplet/boilerplate`](./boilerplate) | Interactive `npx` generator that clones the `github.com/napplet/boilerplate` template into a Vite + TypeScript starter. |
| [`@napplet/skills`](./skills) | Agent skills (design / build / test) that let a coding agent create a napplet end-to-end, plus a `napplet-skills` installer for Claude Code, Cursor, Windsurf, Codex/Amp, Gemini, and Copilot. |

## Dependency graph

```
@napplet/shim ──┐
                ├──► @napplet/nap ──► @napplet/core
@napplet/sdk  ──┘

@napplet/vite-plugin  (build-time only, depends on nostr-tools)

@napplet/conformance-cli ──► @napplet/conformance  (dev/test only, Playwright runner + engine)

@napplet/boilerplate  (CLI generator, clones github.com/napplet/boilerplate)
```

The iframe sandbox requires only `allow-scripts` — **no `allow-same-origin`**.
Napplets cannot access the host shell's DOM, cookies, `localStorage`, or service
workers; all persistent state goes through the shell's proxies.

> Every package is published to [npm](https://www.npmjs.com/org/napplet); most are
> also on [JSR](https://jsr.io/@napplet) (`@napplet/conformance-cli` is npm-only).
> Source lives at [github.com/napplet/napplet](https://github.com/napplet/napplet).
