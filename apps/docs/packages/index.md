# Packages

The napplet SDK is a small set of focused, ESM-only packages. Runtimes use
**`@napplet/shim`** to inject selected domains. Napplets use **`@napplet/sdk`**
and/or `@napplet/core` types, with **`@napplet/vite-plugin`** as a dev
dependency for manifest generation.

| Package | Description |
| --- | --- |
| [`@napplet/core`](./core) | JSON envelope types (`NappletMessage`, `NapDomain`), NAP dispatch infrastructure (`registerNap`, `dispatch`), protocol constants and Nostr types. Imported by all other packages. |
| [`@napplet/shim`](./shim) | Runtime-side helper for injecting selected `window.napplet.<domain>` objects before napplet scripts run. |
| [`@napplet/sdk`](./sdk) | Named TypeScript exports wrapping `window.napplet` for bundler consumers — `relay`, `inc`, `storage`, `keys`, and more, plus type re-exports. |
| [`@napplet/nap`](./nap) | All active domain subpaths as layered exports (barrel / types / shim / sdk per active NAP domain, plus ifc compatibility). Tree-shakable. |
| [`@napplet/vite-plugin`](./vite-plugin) | Vite plugin for napplet manifest generation: per-file `path` hashes, a signed NIP-5D kind 35129 event (NIP-5A tag schema), and `requires` / `connect` / `config` tags at build time. |
| [`@napplet/cli`](./cli) | Standalone CLI for creating projects, owning deploy metadata, installing skills, and deploying to Blossom servers and Nostr relays. |
| [`@napplet/conformance`](./conformance) | Framework-agnostic protocol conformance engine — reference mock shell, per-NAP envelope validators, manifest validator, and reporters. A dev/test tool, not loaded in the sandbox. |
| [`@napplet/conformance-cli`](./conformance-cli) | The headless `napplet-conformance` runner — drives the conformance engine against a napplet in real Chromium via Playwright. Wire it up as `test:conformance`. |
| [`@napplet/conformance-web`](./conformance-web) | Browser conformance runtime deployed at `/conformance` and bundled by the CLI UI/watch mode. |
| [`@napplet/boilerplate`](./boilerplate) | Interactive `npx` generator that clones the `github.com/napplet/boilerplate` template into a Vite + TypeScript starter. |
| [`@napplet/skills`](./skills) | Agent skills (make / design / build / port / test), installed through `napplet skills` for Claude Code, Cursor, Windsurf, Codex/Amp, Gemini, and Copilot. |

## Dependency graph

```
@napplet/shim ──► @napplet/nap ──► @napplet/core
@napplet/sdk  ──► @napplet/core

@napplet/vite-plugin  (build-time only, depends on nostr-tools)
@napplet/cli          (Deno deploy and diagnostics tool)

@napplet/conformance-cli ──► @napplet/conformance + @napplet/conformance-web
@napplet/conformance-web ──► @napplet/conformance

@napplet/boilerplate  (CLI generator, clones github.com/napplet/boilerplate)
```

The iframe sandbox requires only `allow-scripts` — **no `allow-same-origin`**.
Napplets cannot access the host shell's DOM, cookies, `localStorage`, or service
workers; all persistent state goes through the shell's proxies.

> Every package is published to [npm](https://www.npmjs.com/org/napplet); most are
> also on [JSR](https://jsr.io/@napplet) (`@napplet/boilerplate`,
> `@napplet/conformance-cli`, and `@napplet/conformance-web` are npm-only).
> Source lives at [github.com/napplet/napplet](https://github.com/napplet/napplet);
> discussion happens in the
> [community group chat](https://armada.buzz/invite/naddr1qvzqqqyzz5pzpjk98hj7z978r9xc9d2ymagw6tga0lx0s06y8lhpy9twc2kp8uwdqqqqpwqpw5#BAACAwTDEKKhS9_iA_qOc1n4ljVt).
