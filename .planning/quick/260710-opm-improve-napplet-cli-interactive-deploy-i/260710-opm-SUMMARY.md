---
quick_id: 260710-opm
status: complete
completed: 2026-07-10
---

# Quick Task 260710-opm Summary

## Outcome

Improved `@napplet/cli` interactive deploy/init/signing UX while preserving the non-interactive JSON
paths used by CI.

- `napplet deploy` now emits a terminal-first report by default on TTYs and keeps JSON for `--json`
  or non-TTY output.
- Deploy reports include signed manifest event IDs plus `nevent` and `naddr` pointers for root,
  named, and snapshot manifests.
- `--prompt-sec` now uses hidden TTY input terminated by Enter, with piped stdin fallback preserved
  for automation.
- Raw `bunker://` NIP-46 signer pointers are accepted alongside `nbunksec`.
- `napplet init` now runs a guided TTY wizard with safe NIP-66 relay suggestions and NIP-B7 Blossom
  server-list suggestions, while fully flagged/non-TTY init remains deterministic.
- CLI implementation was split into focused helper modules for flags, prompts, deploy/init output,
  init wizard logic, NIP-66/NIP-B7 suggestions, and key command handling.

## Verification

- `deno fmt packages/cli/README.md packages/cli/src packages/cli/tests`
- `deno fmt --check packages/cli/README.md packages/cli/src packages/cli/tests`
- `cd packages/cli && deno task check`
- `cd packages/cli && deno task test:unit`
- CLI smoke test covering `init`, `deploy --dry-run --json`, piped `--prompt-sec`, and TTY human
  deploy output with `nevent`/`naddr`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm lint`
- `pnpm check:jsr`
- `pnpm dlx aislop@0.13.1 scan --changes --json .` (100/100)
- `git diff --check`

## Remaining Risks

- Live public relay/Blossom publish was not exercised with a real funded/allowed signer in this
  task; deploy network paths are still covered by existing unit and dry-run smoke coverage.
- NIP-66 and NIP-B7 discovery inputs are intentionally advisory; init falls back to curated defaults
  when network suggestions are unavailable.
