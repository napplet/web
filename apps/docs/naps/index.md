# NAP domain reference

A **NAP domain** is the runtime surface of a NUB (*Napplet Unified Blueprint*) —
the spec-level extension unit defined by [NIP-5D](/guide/nip-5d). Each domain owns
one message domain: a NUB named `foo` owns all `foo.*` JSON envelope messages, the
payload shapes for them, and the expected shell behavior.

The protocol is modular by design. A NUB must be **independently implementable**,
and shells may support **any subset** of NUBs. That's why napplets feature-gate
with `window.napplet.shell.supports('<domain>')` before using a domain and degrade
gracefully when it's absent — see [Core concepts](/guide/concepts#shell-supports).

These domains ship as subpaths of [`@napplet/nap`](/packages/nap) (barrel /
`types` / `shim` / `sdk` per domain).

## The domains

| Domain | Purpose |
| --- | --- |
| <a id="relay"></a>**relay** | Nostr relay proxy — subscribe, publish, query through the shell's relay pool. |
| <a id="storage"></a>**storage** | Scoped key-value storage proxied through the shell. |
| <a id="inc"></a>**inc** | Inter-napplet communication — topic-based publish/subscribe between napplets. |
| <a id="keys"></a>**keys** | Keyboard bindings and action registration. |
| <a id="theme"></a>**theme** | Read-only shell theme access (types-only today). |
| <a id="media"></a>**media** | Ownership-aware media sessions and playback control. |
| <a id="notify"></a>**notify** | Shell-rendered notifications. |
| <a id="identity"></a>**identity** | Read-only user queries (pubkey, profile metadata, follows, …). |
| <a id="config"></a>**config** | Declarative per-napplet configuration (JSON Schema-driven). |
| <a id="resource"></a>**resource** | Sandboxed byte fetching (`bytes(url) → Blob`) over https / blossom / nostr / data schemes. |
| <a id="connect"></a>**connect** | User-gated direct network access (state-only; grants flow via CSP + a discovery meta tag). |
| <a id="class"></a>**class** | Shell-assigned integer class via the `class.assigned` envelope; exposes `window.napplet.class`. |
| <a id="cvm"></a>**cvm** | Native ContextVM bridge — MCP-over-Nostr (`discover` / `listTools` / `callTool` / `listResources` / `readResource`); the shell owns all transport. |
| <a id="outbox"></a>**outbox** | Outbox-aware relay routing — `query` / `subscribe` / `publish` / `resolveRelays`; the shell owns NIP-65 relay discovery, dedup, and fanout. |
| <a id="upload"></a>**upload** | Shell-mediated file/blob upload over NIP-96 + Blossom rails; the shell signs auth and returns NIP-94 metadata. |

> The `@napplet/nap` package also ships an **`intent`** domain (archetype intent
> dispatch — invoke another napplet by role, with the shell resolving the default
> handler). The 15 domains above are the reference set covered by this site.

## Core domain union

[`@napplet/core`](/packages/core) exports a `NapDomain` string union for the
foundational twelve domains — `relay`, `identity`, `storage`, `inc`, `theme`,
`keys`, `media`, `notify`, `config`, `resource`, `connect`, `class` — used as the
discriminant for envelope routing and `shell.supports()`.

## Where to go next

- [`@napplet/nap`](/packages/nap) — the package and its subpath patterns
- [`@napplet/sdk`](/packages/sdk) — typed helpers and per-domain message unions
- [NIP-5D explained](/guide/nip-5d#nub-extension-framework) — the NUB framework
