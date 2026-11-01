# NAP domain reference

A **NAP** (*Nostr Applet Protocol*) is one capability contract between a napplet and its runtime — what the runtime provides (relay access, storage, intents, …) and exactly how a napplet asks for it. On the web, [NIP-5D](/guide/nip-5d) binds each NAP to a **message domain**: a NAP named `foo` owns all `foo.*` JSON envelope messages, their payload shapes, and the expected shell behavior. NAP contracts are proposed and maintained in the [NAPs track](https://github.com/napplet/naps).

This reference is non-normative. Every domain page defers to its living proposal in the NAPs track, which governs protocol behavior.

The protocol is modular by design. A NAP must be **independently implementable**, and shells may support **any subset** of NAPs. That's why napplets feature-gate with injected domain property presence before using a domain and degrade gracefully when it's absent — see [Core concepts](/guide/concepts#domain-presence).

## Domains by purpose

Each domain has its own page with its purpose, a minimal example, and its implementation maturity. Examples assume the runtime injected `window.napplet` before napplet code ran; the same calls are also importable as named helpers from [`@napplet/sdk`](/packages/sdk), and each domain ships as a subpath of [`@napplet/nap`](/packages/nap) (barrel / `types` / `shim` / `sdk`).

<!-- nap-domain-index -->

## Implementation maturity

These release-time labels describe our shipped implementation, separately from upstream proposal status. Supported does not mean frozen; experimental does not waive conformance requirements. All capabilities remain subject to change. See [maturity and opt-in policy](/naps/maturity).

<!-- nap-maturity-table -->

## Core domain union

[`@napplet/core`](/packages/core) exports a `NapDomain` string union for the foundational domains — `shell`, `relay`, `identity`, `storage`, `inc`, `theme`, `keys`, `media`, `notify`, `config`, `resource`, `cvm`, `outbox`, `upload`, `intent`, `ble`, `webrtc`, `link`, `count`, `lists`, `serial`, `fs`, `common`, `dm`, `gamepad`, `llm` — used as the discriminant for envelope routing and domain presence.

## Where to go next

- [`@napplet/nap`](/packages/nap) — the package and its subpath patterns
- [`@napplet/sdk`](/packages/sdk) — typed helpers and per-domain message unions
- [NIP-5D explained](/guide/nip-5d#nap-extension-framework) — the NAP framework
