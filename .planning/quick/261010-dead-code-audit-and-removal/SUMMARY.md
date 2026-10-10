---
status: complete
---
# Dead-code audit summary

Branch `chore/remove-dead-code` off `main` (6079477d). Commits 276b6c84 (shim modules and root junk file), 4d963697 (dead exports and unused test local), 17e2a31a (unused dependencies and no-op lint task).

Signals: knip, per-package `tsc --noUnusedLocals --noUnusedParameters`, `deno lint no-unused-vars` for the CLI, and grep verification of each candidate against export maps, JSR entries, tests, docs, and workflows. Public package surface and protocol surface are unchanged; the only shipped-output change is the dropped `@napplet/nap` dependency of `@napplet/conformance` (patch changeset).

Verification: `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm type-check`, `pnpm -r test:unit` (boilerplate 7, core 36, conformance 95, nap 181, cli 153, apps/conformance 9, vite-plugin 54, shim 8, conformance-cli 12), `pnpm check:jsr`, `pnpm test:release-tooling`, `pnpm test:skills-contracts`, `pnpm test:convention-contracts` all green; `git diff --check` clean. Slop scan 73 on both `main` and this branch; the findings are pre-existing advisories that #228 clears.
