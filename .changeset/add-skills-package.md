---
"@napplet/skills": minor
---

Add `@napplet/skills` — three agent skills (`design-napplet`, `build-napplet`,
`test-napplet`) that let a coding agent create a napplet end-to-end from one
prompt, plus a `napplet-skills` CLI and programmatic API that install them into
Claude Code, Cursor, Windsurf, `AGENTS.md` (Codex/Amp), Gemini, or Copilot. The
skills are written against the verified live API surface (shim side-effect import
+ `@napplet/sdk` named API, `shell.supports()` / `shell.ready().services`
capability handshake, scoped `storage`, the single-file artifact rule). The
monorepo's root `skills/` is now a symlink to this package's `skills/` so the
repo and the published package share one source of truth.
