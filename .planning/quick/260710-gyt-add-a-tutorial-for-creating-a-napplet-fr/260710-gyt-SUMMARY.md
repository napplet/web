# Quick Task 260710-gyt Summary

## Result

Added a from-scratch Note Drafts napplet tutorial that builds a small Nostr note
composer in intentional layers:

1. Runtime domain boundary and status UI.
2. Read-only `identity` snapshot and change subscription.
3. Shell-scoped `storage.instance` draft autosave.
4. `outbox.publish` kind `1` note publishing through shell policy.
5. Kehto/Paja local runtime setup and artifact verification.

The tutorial links to canonical NIP-5D, NIP-5A, and NAP sources, avoids stale
`shell.supports` / `window.nostr` / browser-storage patterns, and documents the
Vite `modulePreload: false` setting needed to keep the single-file artifact out
of the forbidden `fetch` surface.

## Files

- `apps/docs/guide/build-note-drafts-napplet.md`
- `apps/docs/guide/getting-started.md`
- `apps/docs/.vitepress/config.ts`
- `scripts/test-tutorial.mjs`
- `package.json`

## Validation

- `pnpm test:tutorial` — extracts tutorial files/chunks, type-checks the temp
  app, builds it, asserts single-file metadata, and runs conformance:
  7 passed, 0 failed, 4 skipped.
- `pnpm --filter @napplet/docs build`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm lint` — no lint tasks configured.
- `npx --yes aislop scan --changes .` — 100/100, no issues.
- `npx --yes aislop scan .` — 88/100 from pre-existing repo-wide complexity
  warnings outside this change; 0 errors.
- `git diff --check`
- `pnpm test` — `check:jsr`, unit suites, and `test:tutorial`.

## Notes

- No changeset: this is docs/test/root-script coverage only; no publishable
  package output changed.
- The tutorial test intentionally assembles the cumulative `src/main.ts` chunks
  rather than testing a hidden fixture, so future tutorial edits must remain
  executable.
