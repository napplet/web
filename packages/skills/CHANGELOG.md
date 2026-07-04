# @napplet/skills

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
