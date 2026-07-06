---
status: in-progress
created: 2026-07-06
quick_id: 260706-lsr
slug: task-ensure-napplet-skills-include-all-a
---

# Quick Task 260706-lsr: Align Skills With Implemented Package NAPs

## Goal

Ensure the napplet authoring skills cover every NAP domain implemented by the
current `@napplet/nap` / `@napplet/sdk` package surface, with NAP-KEYS explicit
enough that shortcut/keybinding features route there by default.

## Authority

Package exports are the source of truth for usable skill guidance:

- `packages/nap/package.json` subpath exports
- `packages/nap/src/*/types.ts` `DOMAIN` constants
- `packages/sdk/src/index.ts` named SDK exports

Do not promote unimplemented NAP specs or PRs as usable API.

## Implemented Domains

`relay`, `identity`, `storage`, `inc`, `theme`, `keys`, `media`, `notify`,
`config`, `resource`, `cvm`, `outbox`, `upload`, `intent`, `ble`, `webrtc`,
`link`, `count`, `lists`, `serial`, `common`, `dm`.

`ifc` is a deprecated compatibility alias for `inc`; do not choose it for new
work.

## Tasks

1. Inventory package-implemented NAP domains.
   - Done: package exports and DOMAIN constants confirmed.

2. Update authoring skills.
   - Done: `design-napplet`, `build-napplet`, `make-napplet`, and
     `port-nostr-app` now carry the implemented-domain inventory.
   - Done: shortcut/keybinding features explicitly route to NAP-KEYS.

3. Add regression coverage.
   - Done: `packages/skills/src/index.test.ts` asserts the main authoring skills
     mention every implemented domain and that `build-napplet` includes
     NAP-KEYS guidance.

4. Verify and ship.
   - Done: package/root verification.
   - Pending: commit, push, and PR.

## Verification Evidence

- `pnpm --filter @napplet/skills exec vitest run src/index.test.ts`
- `pnpm --filter @napplet/skills type-check`
- `pnpm --filter @napplet/skills build`
- `pnpm --filter @napplet/skills test:unit`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm lint` (no lint tasks configured)
- `git diff --check`
- `rg -n "NAP-POW|NAP-VALUE|NAP-SYSTEM|NAP-HASHTREE|NAP-TORRENT|NAP-BLOSSOM|proof-of-work|hashtree|torrent|system, or value" packages/skills/skills packages/skills/README.md` (no matches)
- AI-slop: no `aislop` / `ai-slop` CLI and no `.aislop/config.yml` are present in this checkout.
