---
status: resolved
trigger: "pnpm dev:site fails in /Users/sandwich/Develop/napplet-showcase because another Astro server is running; find open ports instead of requiring static ports."
created: 2026-10-21
updated: 2026-10-21
---

## Symptoms

Expected: website and documentation start together on available ports, including when other worktrees or a previous preview are running.

Actual: Astro rejects the project lock for background PID 71736 at port 5176. Documentation requires port 5174 and the website redirects to that hardcoded address.

## Current Focus

hypothesis: confirmed — the Astro CLI singleton lock and fixed documentation port independently prevent concurrent development sessions.
next_action: complete — implementation, regression checks, browser verification, and application to the requested worktree passed.

## Evidence

- The showcase worktree is clean on feat/astro-ecosystem-showcase; PR #221 targets main. The initial agent worktree predates Astro, so fix/dev-site-startup branches from the showcase revision. An unrelated package.json workspaces edit was preserved and will be excluded from commits.
- apps/web/.astro/dev.json records a background server with PID 71736, port 5176. Astro 7.3.5 CLI checks that lock before binding. Its public dev API does not use the CLI lock. The documented --ignore-lock CLI option supports foreground concurrent instances.
- apps/docs/package.json uses --port 5174 --strictPort. apps/web/astro.config.mjs redirects documentation requests to localhost:5174 regardless of the actual bound port.
- The selected workflow is gsd-debug, executed inline under its spawn restriction; the user supplied the reproduction, expected behavior, and error.

## Resolution

Root cause: Astro CLI rejects a second server for the project before trying ports; docs separately required a fixed port, also embedded in the website redirect.

Fix: `scripts/dev-site.mjs` starts VitePress before Astro through their public JavaScript APIs in one foreground process. Astro binds port 0. Vite 6 treats zero as its default port, so docs receive an OS-selected available candidate with fallback enabled if that candidate is claimed before binding. The launcher reads the actual bound documentation address and supplies it to the website redirect. Standalone dev scripts also permit available ports; the Astro CLI script uses its documented `--ignore-lock` option. Startup failure closes docs, and combined startup/cleanup errors preserve both causes. The browser smoke command takes the printed website URL. No published package output or protocol surface changes.

Verification:

- The redirect regression failed against the previous hardcoded localhost:5174 behavior, then passed after the fix. Four focused tests now pass, including distinct real listening ports for paired launches, cleanup after website startup failure, and preservation of startup/cleanup diagnostics. `pnpm test:workflow-contracts` passes all 12 checks.
- `pnpm build`, `pnpm type-check`, and `pnpm -r test:unit` passed. Logs: `/tmp/napplet-dev-site-build.log`, `/tmp/napplet-dev-site-types.log`, `/tmp/napplet-dev-site-unit.log`, and `/tmp/napplet-dev-site-workflow-tests.log`.
- Two real paired launches ran concurrently; docs redirects retained path/query and each reached its own documentation server with HTTP 200. The final allocation used website port 55876 and docs port 55817. Playwright verified the homepage, three playable apps, docs navigation, and hydrated search. All four temporary listeners closed after termination, while the existing preview at 5176 remained available.
- The clean requested showcase worktree was fast-forwarded to implementation commit `bc46167a`. `pnpm dev:site` successfully bound website port 57547 and docs port 57530 there; the full browser smoke passed, the documentation redirect used port 57530, and `.astro/dev.json` still referenced the original background PID 71736.
- Final pinned `aislop@0.12.0` scan against original showcase revision `e35f0d93`: score 85/100, above CI's minimum 70, with zero formatting, lint, code-quality, or AI-slop findings. Its three remaining findings concern pre-existing fflate, http-cache-semantics, and Vite dependency advisories; dependency versions and the gate configuration were not changed. CLI exit 1 reflects those advisories, which the existing CI gate explicitly treats as non-blocking when the score passes. Output: `/tmp/napplet-dev-site-final-slop.json`.
- The unrelated package.json workspaces edit remains uncommitted in the agent worktree and is excluded from the fix. Deno-generated lockfile churn caused by that edit was removed. No changeset is needed for development-only scripts and private site packages.
