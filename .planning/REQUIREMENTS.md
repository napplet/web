# Milestone v0.34.0 - NIP-5D Runtime Injection - Requirements

**Goal:** Align the monorepo with the current NIP-5D draft where runtimes inject
`window.napplet` domain objects before any napplet script runs. Napplets detect
domain availability by object presence, not by `window.napplet.shell.supports()`.

**Source of truth:** [NIP-5D PR #2303](https://github.com/nostr-protocol/nips/pull/2303)
head `6ca5632` (`5D.md`) plus NAP domain specs in
[github.com/napplet/naps](https://github.com/napplet/naps). The draft is still
marked `draft` / `optional`; implement the current head but cite it as a living
external source.

## v0.34.0 Requirements

### Protocol boundary (NIP5D)

- [ ] **NIP5D-01**: `window.napplet.shell`, `shell.supports()`,
  `shell.ready`, `shell.init`, `ShellEnvironment`, and the `@napplet/nap/shell`
  subpath are not required by any current package, conformance check, fixture,
  doc, or skill as normative protocol surface.
- [ ] **NIP5D-02**: `window.napplet` is modeled as a runtime-injected namespace
  whose supported NAP domains are present as properties and whose unsupported
  domains are absent.
- [ ] **NIP5D-03**: Generic domain availability docs and code examples use
  property-presence checks (`if (window.napplet.relay)`) rather than boolean
  `supports()` calls.
- [ ] **NIP5D-04**: Runtime injection is documented as outside the signed napplet
  artifact and must not change bytes used for `aggregateHash`.

### Package surfaces (PKG)

- [ ] **PKG-01**: `@napplet/core` types expose optional NAP domain properties on
  `NappletGlobal` and remove exported shell-handshake/capability-query types
  from the active public contract.
- [ ] **PKG-02**: `@napplet/shim` is usable by runtimes as an injection payload
  and can install a selected subset of NAP domain objects.
- [ ] **PKG-03**: `@napplet/shim` no longer posts `shell.ready`, waits for
  `shell.init`, or uses handshake arrival as the runtime guard success signal.
- [ ] **PKG-04**: `@napplet/nap` removes the `shell` subpath and any shell
  helper APIs that imply a generic runtime capability query.
- [ ] **PKG-05**: `@napplet/sdk` remains napplet-author-friendly while treating
  missing domain objects as unavailable domains; exported helpers throw clear
  errors when a domain is absent.

### Conformance and tooling (CONF)

- [ ] **CONF-01**: `@napplet/conformance` boot success is based on an injected
  `window.napplet` namespace, not on observing `shell.ready`.
- [ ] **CONF-02**: The conformance reference runtime injects selected domain
  objects before napplet fixture scripts run.
- [ ] **CONF-03**: Envelope validation and drift tests remove `shell.ready` /
  `shell.init` as foundational validators.
- [ ] **CONF-04**: Fixture napplets no longer emit or wait for shell handshake
  traffic; they exercise valid/invalid domain traffic directly through the
  injected runtime surface or postMessage envelopes.
- [ ] **CONF-05**: CLI/web conformance docs and tests no longer include
  `supports() = false` graceful-degradation checks as the generic contract;
  absence of a domain object is the generic unavailable-domain signal.

### Docs, skills, boilerplate (DOC)

- [ ] **DOC-01**: Root README, package READMEs, and `apps/docs/**` explain
  runtime injection, optional domain properties, and property-presence gating.
- [ ] **DOC-02**: `packages/skills` and root `skills/` guidance tell agents that
  runtimes consume `@napplet/shim`; napplets install types and optionally the
  SDK, not the shim as their own bootstrap dependency.
- [ ] **DOC-03**: Boilerplate package/docs are checked for stale shim import or
  `supports()` assumptions and updated to current runtime-injection guidance.
- [ ] **DOC-04**: AGENTS.md policy remains strict that conformance/build hard
  errors must cite NIP-5D/NAP clauses, and any historical NAP-SHELL mentions are
  framed as stale/invalid if kept as examples.

### Release and verification (REL)

- [ ] **REL-01**: Changesets exist for every package whose shipped output or
  public behavior changed; pre-1.0 breaking changes use minor bumps.
- [ ] **REL-02**: `pnpm build`, `pnpm type-check`, `pnpm -r test:unit`,
  `pnpm test:conformance`, `git diff --check`, and the AI-slop gate are run and
  recorded.
- [ ] **REL-03**: Repo-wide first-party grep proves no current live surface still
  presents `shell.supports`, `shell.ready`, `shell.init`, `NAP-SHELL`, or
  `@napplet/nap/shell` as normative protocol.
- [ ] **REL-04**: Branch is pushed and PR opened with a body citing the NIP-5D
  PR head, changed packages, verification, and known draft-status risk.

## Out of Scope

- Defining a replacement generic bootstrap, version negotiation, diagnostics, or
  environment snapshot. NIP-5D does not define one; if needed, it belongs in a
  separate NAP.
- Implementing downstream runtime loading in Kehto/Hyprgate. This milestone
  updates the Napplet monorepo package, conformance, docs, skills, and
  boilerplate guidance.
- Changing NAP domain operation semantics beyond what is necessary for domain
  presence/absence.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| NIP5D-01 | Phase 156, Phase 157, Phase 158, Phase 159 | Planned |
| NIP5D-02 | Phase 157, Phase 158 | Planned |
| NIP5D-03 | Phase 157, Phase 159 | Planned |
| NIP5D-04 | Phase 159 | Planned |
| PKG-01 | Phase 157 | Planned |
| PKG-02 | Phase 157 | Planned |
| PKG-03 | Phase 157 | Planned |
| PKG-04 | Phase 157 | Planned |
| PKG-05 | Phase 157 | Planned |
| CONF-01 | Phase 158 | Planned |
| CONF-02 | Phase 158 | Planned |
| CONF-03 | Phase 158 | Planned |
| CONF-04 | Phase 158 | Planned |
| CONF-05 | Phase 158, Phase 159 | Planned |
| DOC-01 | Phase 159 | Planned |
| DOC-02 | Phase 159 | Planned |
| DOC-03 | Phase 159 | Planned |
| DOC-04 | Phase 159 | Planned |
| REL-01 | Phase 160 | Planned |
| REL-02 | Phase 160 | Planned |
| REL-03 | Phase 160 | Planned |
| REL-04 | Phase 160 | Planned |

**Coverage:** 22/22 v0.34.0 requirements mapped.
