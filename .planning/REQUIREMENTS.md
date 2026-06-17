# Milestone v0.33.0 — NAP-SHELL Alignment — Requirements

**Goal:** Align the SDK to the updated NAPs track — implement the mandatory NAP-SHELL
bootstrap handshake, and defer the now-inactive NAP-CLASS and NAP-CONNECT domains.

**Source of truth:** the NAPs track ([github.com/napplet/naps](https://github.com/napplet/naps),
`naps/NAP-SHELL.md` + README domain table) and [NIP-5D PR #2303](https://github.com/nostr-protocol/nips/pull/2303).
Never invent protocol surface (AGENTS.md "Protocol fidelity"). Breaking change (0.x ⇒ minor).

REQ-IDs continue the project's category-numbered convention. Staged to stay GREEN at every
commit: **defer `class` → defer `connect` → implement NAP-SHELL** (retiring class/connect first
clears the `perm:`/`sandbox` capability tokens so NAP-SHELL lands on the clean `{domains,protocols}`
capabilities shape).

## v0.33.0 Requirements

### Defer inactive NAPs (DEFER)

- [x] **DEFER-01**: The `class` (NAP-CLASS) domain is removed from the active surface — `NAP_DOMAINS`/`NapDomain`, `window.napplet.class`, the `@napplet/nap/class` subpath (+ package/jsr/tsup exports), shim install + router, sdk re-exports, the `class.assigned` conformance envelope, and docs/READMEs. *(shipped — commit 9aa4b80)*
- [x] **DEFER-02**: The `connect` (NAP-CONNECT) domain is removed from the runtime surface — `NAP_DOMAINS`/`NapDomain`, `window.napplet.connect`, the `@napplet/nap/connect` subpath incl. `__fixtures__` (+ package/jsr/tsup exports), sdk re-exports, and the conformance connect envelopes. *(Phase 154-01)*
- [x] **DEFER-03**: NAP-CONNECT's build/manifest surface is removed from `@napplet/vite-plugin` — the `connect` option, manifest `connect` tags, the `napplet-connect-requires` dev meta, `connect.ts`/`normalizeConnectOptions`, and the now-orphaned `strictCsp` deprecation — while NIP-5A manifest generation still works. *(Phase 154-01)*
- [x] **DEFER-04**: The conformance `manifest/connect-origins` check and the `normalizeConnectOrigin` dependency are removed; `validateManifest` no longer references connect origins. *(Phase 154-01)*

### NAP-SHELL bootstrap handshake (SHELL)

- [x] **SHELL-01**: The conformance envelope validator recognizes `shell.ready` (outbound) and `shell.init` (inbound) as NAP-SHELL envelopes — the reference-shell special-case that bypassed the domain validator is removed, and `shell` is registered as the foundational (non-`supports()`-discoverable) domain.
- [x] **SHELL-02**: `@napplet/shim` posts `shell.ready` (no payload) and caches the `shell.init` environment `{ capabilities: { domains, protocols }, services, class }`, then answers `supports(domain, protocol?)` synchronously and locally — `false` before init and for any unknown domain/protocol.
- [x] **SHELL-03**: `window.napplet.shell` exposes `supports(domain, protocol?)`, `services: string[]`, `class: number | null` (opaque), `ready(): Promise<ShellEnvironment>`, and `onReady(handler)`, typed in `@napplet/core`.
- [x] **SHELL-04**: The conformance reference shell replies with `shell.init` in the `{ capabilities: { domains, protocols }, services, class }` shape (migrated off `{ naps, sandbox }`); the boot harness still detects readiness.
- [x] **SHELL-05**: A `@napplet/nap/shell` subpath exposes NAP-SHELL types (and any shim/sdk surface) consistent with the other domains' subpath layout.
- [x] **SHELL-06**: The conformance `boot/installs-global`, `boot/no-boot-error`, and graceful-degradation checks are re-titled/documented to cite NAP-SHELL as the contract they verify (no longer a private handshake).

## Future Requirements (deferred)

- **VALUE-0x**: Implement NAP-VALUE (`value` domain) — shell-mediated value transfer / zaps.
- **POW-0x**: Implement NAP-POW (`pow` domain) — NIP-13 proof-of-work miner.
- Reactivate NAP-CLASS / NAP-CONNECT if/when the track un-defers them.

## Out of Scope

- The new `value` (NAP-VALUE) and `pow` (NAP-POW) domains — separate milestone (the track lists them as new optional drafts; not part of this alignment).
- Any reimplementation of class/connect behavior — they are deferred, not reshaped.

## Traceability

Every v0.33.0 requirement maps to exactly one phase (DEFER-01 shipped pre-milestone in commit `9aa4b80`).

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEFER-01 | — (shipped `9aa4b80`) | Complete |
| DEFER-02 | Phase 154 | Complete |
| DEFER-03 | Phase 154 | Complete |
| DEFER-04 | Phase 154 | Complete |
| SHELL-01 | Phase 155 | Complete |
| SHELL-02 | Phase 155 | Complete |
| SHELL-03 | Phase 155 | Complete |
| SHELL-04 | Phase 155 | Complete |
| SHELL-05 | Phase 155 | Complete |
| SHELL-06 | Phase 155 | Complete |

**Coverage:** 10/10 v0.33.0 requirements mapped (DEFER-01 already complete; DEFER-02..04 → Phase 154; SHELL-01..06 → Phase 155). No orphans, no duplicates.
