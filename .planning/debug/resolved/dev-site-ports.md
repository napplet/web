---
status: resolved
trigger: pnpm dev:site must select open ports dynamically on a host running many dev servers
created: 2026-10-28
updated: 2026-10-28
---

# Dynamic website and docs ports

## Evidence

The main checkout's dev:site script starts two independent Turbo tasks. The docs script requires port 5174 and the web Vite proxy points at that fixed port. This prevents concurrent checkouts. The showcase branch has a programmatic runner that already chooses open ports; adapt that implementation for both main's Vite website and the Astro showcase without adding dependencies.

## Plan

Start documentation first on an OS-selected open port, read its actual bound address, and pass it to the website. Select the website port dynamically too. Standalone website/docs scripts use the same runner. Keep fallback enabled for a race between selecting and binding a port. Preserve foreground shutdown and cleanup on failed startup. Add meaningful listener/concurrency tests and verify two real simultaneous runs plus Vue hydration/search. Preserve unrelated package.json workspace metadata when staging the script changes.

## Resolution and verification

The shared runner starts docs first using an OS-selected port, reads its actual listening address, then starts the Vite or Astro website on another OS-selected port. Vite receives the docs proxy target directly; Astro keeps its per-instance docs redirect. Frontend APIs are loaded before either listener starts. Both standalone dev commands use the same allocator. Startup failure cleanup and foreground shutdown close only the listeners owned by that invocation.

Verified two real concurrent Vite launches using four distinct ports (64330/64332 and 64331/64333). Both rendered the website and documentation, hydrated search returned 16 results, and their HMR clients referenced the correct docs port. Standalone docs and web chose 49632 and 49635. The same runner was exercised against the Astro showcase with two live instances, current gameplay, docs navigation/search, correct destination/HMR addresses and independent shutdown. Astro redirects docs to their own origin, so the browser test follows that navigation before checking HMR rather than probing a synthetic asset path on the website.

Added four socket lifecycle/mode tests to the workflow-contract suite (12 total passing), plus an actual browser smoke script run by link-check CI after Chromium installation. The smoke script starts two instances, verifies routing/query preservation, HMR, Vue search, available previews and independent shutdown, then closes its own instances. Build (12 tasks), type-check (19 tasks), recursive units and browser smoke checks pass. Pinned AI-slop scan scores 98/100 with the existing low deepmerge advisory and no source findings. No dependency versions changed.

The original package.json workspace metadata is preserved and excluded from the staged script patch. Generated Deno lock changes were saved outside the repo and restored to their initial tracked bytes. Protocol and production loading behavior are unchanged.
