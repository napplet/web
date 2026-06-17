---
"@napplet/core": minor
"@napplet/shim": minor
"@napplet/nap": minor
"@napplet/conformance": minor
---

Retire the residual NAP-CLASS `class` field from NAP-SHELL (AGENTS.md rule 8: a
deferred NAP's surface must not outlive the NAP). The opaque `class` integer was
re-homed into NAP-SHELL's `shell.init` environment during the NAP-CLASS defer,
but canonical NAP-SHELL carries no class field. The `shell.init` wire shape is
now `{ capabilities, services }`.

**BREAKING CHANGE:**

- `shell.init` no longer carries `class`.
- `ShellEnvironment`, `ShellInitMessage`, and `NappletShell` no longer have a
  `class` field (`@napplet/core`).
- `window.napplet.shell.class` is removed (`@napplet/shim`).
- `@napplet/nap/shell` no longer exports `shellClass()`.
- The conformance reference shell emits a class-free `shell.init` and its
  `createReferenceShell` no longer accepts a `class` option (`@napplet/conformance`).
