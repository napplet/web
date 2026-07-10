# @napplet/skills

## 0.2.8

### Patch Changes

- 0c76ded: Align NAP-OUTBOX publish fanout with the current draft by replacing
  `targetAuthors` with explicit `toOutbox`, `toInboxes`, and validated `relays`
  guidance.

## 0.2.7

### Patch Changes

- dc00955: Align napplet authoring guidance with the current SDK/runtime contract.

## 0.2.6

### Patch Changes

- dd2b0bc: Harden napplet sandbox authoring and verification.

  - `@napplet/nap` decodes `data:` resource URLs without using browser `fetch`.
  - `@napplet/conformance-cli` flags direct browser network, storage, cookie, and external network-loaded asset surfaces in served napplet code.
  - `@napplet/conformance` reports the broader forbidden-surface check accurately.
  - `@napplet/skills` moves the sandbox authority contract into the top-level authoring flow so generated napplets route bytes, state, relays, signing, and links through shell-owned NAPs.

- 22d2e45: Align NAP-RESOURCE public type and docs with the canonical `htree:` resource
  scheme.

## 0.2.5

### Patch Changes

- 85683dc: Teach napplet authoring skills to prefer `@napplet/sdk` helpers for implementation calls, reserving direct `window.napplet?.domain` access for capability gates and true SDK gaps.

## 0.2.4

### Patch Changes

- 4cfc04f: Teach napplet build skills to start from the boilerplate generator and preserve its tooling substrate.
- 0f3ed8c: Align napplet authoring skills with all NAP domains implemented by the current `@napplet/*` package surface, including explicit NAP-KEYS guidance for shortcuts and keybindings.

## 0.2.3

### Patch Changes

- bb5ff4b: Add `codex` as a project-local installer target that writes shipped napplet
  skills to `.codex/skills/<skill>/SKILL.md`.

## 0.2.2

### Patch Changes

- 82e50c2: Teach OUTBOX-first napplet construction, add a one-prompt `make-napplet` orchestration skill, and align copied package examples so agents do not default social reads and publishes to low-level NAP-RELAY.

## 0.2.1

### Patch Changes

- 688fb59: Align first-party packages with current NIP-5D runtime injection.

  Runtimes now expose available NAPs by injecting `window.napplet.<domain>`
  properties before napplet code runs. The retired generic shell capability
  surface is removed from active package APIs: no `window.napplet.shell`, no
  `shell.ready` / `shell.init` handshake, and no `@napplet/nap/shell` subpath.

  Conformance now injects the runtime namespace before fixture code and validates
  only NAP domain envelopes. Skills and package guidance now teach domain-property
  presence instead of the retired shell supports API.

## 0.2.0

### Minor Changes

- ced6043: Add `@napplet/skills` — three agent skills (`design-napplet`, `build-napplet`,
  `test-napplet`) that let a coding agent create a napplet end-to-end from one
  prompt, plus a `napplet-skills` CLI and programmatic API that install them into
  Claude Code, Cursor, Windsurf, `AGENTS.md` (Codex/Amp), Gemini, or Copilot. The
  skills are written against the verified live API surface (`@napplet/sdk` named
  API, injected-domain property presence for capability checks, scoped `storage`,
  the single-file artifact rule). The
  monorepo's root `skills/` is now a symlink to this package's `skills/` so the
  repo and the published package share one source of truth.
