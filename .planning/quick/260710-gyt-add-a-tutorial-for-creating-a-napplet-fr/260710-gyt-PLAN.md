---
quick_id: 260710-gyt
status: complete
created: 2026-07-10
mode: quick
must_haves:
  - A from-scratch tutorial exists in the docs and chooses one common, interesting Nostr UX case.
  - Tutorial protocol claims are checked against canonical NIP-5D/NAP sources, not repo memory.
  - Tutorial uses the current Napplet package surface plus Kehto/Paja runtime guidance.
  - A programmatic test suite validates the tutorial project code and expected build/test commands.
  - Final proof includes repo gates, tutorial tests, AI-slop scan, commit, push, and open PR.
---

# Quick Task 260710-gyt: From-Scratch Napplet Tutorial

## Scope

Add a tutorial that takes a user from an empty directory to a working napplet using
the Napplet packages and Kehto/Paja. The tutorial must pick a Nostr UX case that
is useful enough to be interesting but small enough to be teachable.

## Tasks

1. Research and select the tutorial use case.
   - Files: canonical NIP-5D/NAP docs, Napplet package docs, local Kehto/Paja docs.
   - Action: verify the current protocol/runtime/package facts, then choose and justify the example.
   - Verify: notes in the tutorial cite canonical sources where protocol rules matter.
   - Done: no invented protocol surface or stale runtime model is used.

2. Write the tutorial.
   - Files: docs site guide pages and nav config.
   - Action: add a complete from-scratch guide with commands, source files, explanation, and Kehto/Paja run path.
   - Verify: docs build/link syntax accepts the new page.
   - Done: a user can follow the page from zero to a local working napplet.

3. Add executable tutorial validation.
   - Files: a focused test fixture/harness under the existing test conventions.
   - Action: programmatically materialize the tutorial project, run the tutorial's package/build checks, and assert required source/docs fragments stay synchronized.
   - Verify: focused tutorial test plus repo gates pass.
   - Done: future edits break tests when tutorial commands or copied code become inaccurate.

## Verification Targets

- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- docs build/check command discovered from repo scripts
- focused tutorial validation command
- `npx --yes aislop scan --changes .`
- `git diff --check`
- pushed branch and open GitHub PR
