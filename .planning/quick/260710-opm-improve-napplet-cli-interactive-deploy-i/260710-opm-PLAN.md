---
quick_id: 260710-opm
status: planned
created: 2026-07-10
---

# Quick Task 260710-opm: Improve @napplet/cli interactive deploy/init/key UX toward nsyte parity

## Objective

Move the current `@napplet/cli` UX toward nsyte-quality output without changing NIP-5D/NIP-5A wire
semantics: keep non-interactive JSON paths available for CI, but make the default interactive
deploy/key flow readable, secure, and useful.

## Tasks

1. Secure prompt and output mode
   - Files: `packages/cli/src/cli.ts`, focused CLI tests.
   - Action: Replace Ctrl-D stdin secret collection with Enter-based hidden TTY input, retain piped
     stdin fallback, add `--json` for deploy/debug/discover machine output, and keep `--dry-run`
     non-network behavior intact.
   - Verify: prompt helper unit tests cover hidden-prompt injection and piped fallback; CLI check
     passes.

2. Beautiful deploy summary with NIP-19 pointers
   - Files: `packages/cli/src/cli.ts` and small helper module if needed.
   - Action: Render deploy plan, signer, upload, relay publish, and signed-event summaries in a
     readable CLI layout. Include `naddr` pointers for signed root/named/snapshot events and event
     IDs after publish. Do not change event kinds or tags in this UX pass.
   - Verify: unit tests assert pointer generation and human output includes targets, relays, Blossom
     servers, and success/failure counts.

3. Docs and GSD closeout
   - Files: `packages/cli/README.md`, `.planning/quick/.../SUMMARY.md`, `.planning/STATE.md`.
   - Action: Document the interactive defaults and explicit JSON/CI path.
   - Verify: `deno fmt --check packages/cli`; `deno task check` and `deno task test:unit` in
     `packages/cli`; repo-level gates as time permits before PR.

4. Guided init with live suggestions
   - Files: `packages/cli/src/cli.ts`, prompt/suggestion helpers, focused tests.
   - Action: In interactive terminals, prompt for source dir, root/named target, relays, and Blossom
     servers when flags are omitted. Pull relay suggestions from NIP-66 discovery events on
     `wss://relaypag.es` with safe fallbacks, and pull Blossom server suggestions from kind `10063`
     server-list events with safe fallbacks. Keep fully flagged/non-TTY init deterministic.
   - Verify: helper tests cover suggestion extraction, fallback behavior, d-tag validation, and
     prompt input parsing.

## Constraints

- No new runtime dependencies.
- Preserve protocol fidelity: this pass formats existing signed/published events and does not
  reinterpret NIP-5A kinds/tags.
- Keep the full user objective active after this slice unless the broader PR and verification prove
  the whole UX parity target.
