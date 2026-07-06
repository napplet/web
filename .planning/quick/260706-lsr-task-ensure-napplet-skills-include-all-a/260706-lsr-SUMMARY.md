---
status: complete
created: 2026-07-06
quick_id: 260706-lsr
commit: 986299aa
---

# Quick Task 260706-lsr Summary

Aligned the napplet authoring skills with the current `@napplet/*` package
surface. The skills now cover every implemented package NAP domain and do not
promote unimplemented NAP specs or PRs as usable API.

Implemented package domains covered:

`relay`, `identity`, `storage`, `inc`, `theme`, `keys`, `media`, `notify`,
`config`, `resource`, `cvm`, `outbox`, `upload`, `intent`, `ble`, `webrtc`,
`link`, `count`, `lists`, `serial`, `common`, `dm`.

Key changes:

- Added the full implemented-domain inventory to the main authoring skills.
- Added explicit NAP-KEYS guidance for shortcuts, hotkeys, forwarded key events,
  and app-level action keybindings.
- Kept deprecated `ifc` as an INC compatibility alias, not a new-work target.
- Added regression coverage so the main authoring skills mention every
  implemented package domain and the build skill keeps NAP-KEYS guidance.
- Added a patch changeset for `@napplet/skills`.

Verification:

- `pnpm --filter @napplet/skills exec vitest run src/index.test.ts`
- `pnpm --filter @napplet/skills type-check`
- `pnpm --filter @napplet/skills build`
- `pnpm --filter @napplet/skills test:unit`
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `pnpm lint` (no lint tasks configured)
- `git diff --check`
- Unimplemented NAP promotion search returned no matches.
- AI-slop was not runnable in this checkout: no `aislop` / `ai-slop` CLI and no
  `.aislop/config.yml` are present.
