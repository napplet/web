---
status: investigating
trigger: "pnpm dev:site fails in /Users/sandwich/Develop/napplet-showcase because another Astro server is running; find open ports instead of requiring static ports."
created: 2026-10-21
updated: 2026-10-21
---

## Symptoms

Expected: website and documentation start together on available ports, including when other worktrees or a previous preview are running.

Actual: Astro rejects the project lock for background PID 71736 at port 5176. Documentation requires port 5174 and the website redirects to that hardcoded address.

## Current Focus

hypothesis: the Astro CLI singleton lock and fixed documentation port independently prevent concurrent development sessions.
next_action: start both servers through their supported JavaScript APIs using port 0, wire the bound documentation origin into the website redirect, and verify concurrent launches and shutdown.

## Evidence

- The showcase worktree is clean on feat/astro-ecosystem-showcase; PR #221 targets main. The initial agent worktree predates Astro, so fix/dev-site-startup branches from the showcase revision. An unrelated package.json workspaces edit was preserved and will be excluded from commits.
- apps/web/.astro/dev.json records a background server with PID 71736, port 5176. Astro 7.3.5 CLI checks that lock before binding. Its public dev API does not use the CLI lock. The documented --ignore-lock CLI option supports foreground concurrent instances.
- apps/docs/package.json uses --port 5174 --strictPort. apps/web/astro.config.mjs redirects documentation requests to localhost:5174 regardless of the actual bound port.
- The selected workflow is gsd-debug, executed inline under its spawn restriction; the user supplied the reproduction, expected behavior, and error.

## Resolution

Pending implementation and regression verification.
