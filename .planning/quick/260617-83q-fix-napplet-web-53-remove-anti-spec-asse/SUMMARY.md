---
status: complete
quick_id: 260617-83q
date: 2026-06-17
---

# Quick Task: Remove anti-spec inline-script enforcement (napplet/web#53)

## Problem

`@napplet/vite-plugin@0.8.0` ran `assertNoInlineScripts()` unconditionally in
`closeBundle`, hard-failing any build whose `dist/index.html` carried an inline
`<script>`. The same rule was mirrored as a live `manifest/no-inline-scripts`
conformance check. Both enforced an **invented** "v0.29.0 shell-as-CSP-authority
/ `script-src 'self'`" model that NIP-5D never defines.

Canonical NIP-5D (PR #2303) loads a napplet as a single self-contained
`/index.html` via `iframe.srcdoc` + `sandbox="allow-scripts"` (no
`allow-same-origin` → opaque origin, no served URL). Inline JS is therefore
**mandatory** — there is no origin to fetch an external `<script src>` from. The
enforcement was the exact inverse of the spec and broke kehto's released-package
playground. The justifying model rode on NAP-CONNECT/strict-CSP, which was
**deferred** from the NAPs track (v0.33.0, #48) — orphaning the enforcement.

## Changes

- **`@napplet/vite-plugin`** (→ 0.8.1): deleted `assertNoInlineScripts` from
  `html.ts`, removed its unconditional call in `manifest.ts`. `single-file` mode
  preserved; pre-existing inline scripts now survive verbatim. Tests replaced.
- **`@napplet/conformance`** + bundled **`@napplet/conformance-cli`** (→ 0.2.1):
  removed the `manifest/no-inline-scripts` check, `inline-script` error code,
  `findInlineScripts` export. Added a regression guard. Catalog now 11 checks.
- **Docs**: corrected `packages/vite-plugin/README.md`,
  `apps/docs/packages/vite-plugin.md`, `skills/build-napplet/SKILL.md`.
- **`AGENTS.md`**: hardened Protocol-fidelity guardrails — (1) loading/transport/
  CSP/artifact-shape added to rule 1's inventable surface; (4) build-time hard
  errors must cite a spec clause like conformance checks; (7) no normative
  decision is "locked" without a spec citation; (8) retire-on-defer sweep rule.
- **Changeset**: patch bump for all three published packages.

## Verification

- `pnpm build` — 11/11 green
- `pnpm type-check` — 15/15 green
- `pnpm -r test:unit` — all green (vite-plugin 8, conformance 62, cli 8, …)
- AI-slop gate — 89/100; all 4 code engines 0 issues (deductions are pre-existing
  external dep advisories only, excluded from the CI hard-fail).

## Flagged (out of scope — not changed)

- `skills/build-napplet/SKILL.md` still references `window.napplet.class` /
  `shell.supports('nap:class')` and a "strict CSP" posture — likely orphans of
  the NAP-CLASS defer. Flagged for a follow-up retire-on-defer sweep (rule 8).
- The conformance validator still keys on `napplet-type` / `napplet-requires`
  meta tags — verify these against canonical NIP-5A before relying on them.
