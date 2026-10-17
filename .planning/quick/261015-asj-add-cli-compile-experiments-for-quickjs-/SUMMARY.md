---
status: complete
---

# CLI compile experiments

Added nine native compile presets to `packages/cli/deno.json` and pnpm aliases for these plus the five existing platform tasks. All presets use the standalone entrypoint and existing runtime permissions. Experimental outputs live under `dist/experiments/`; the release build matrix is unchanged. Added a patch changeset and README instructions, measured sizes, and an explicit QuickJS/minification startup limitation.

## Verification

- Deno 2.9.5 on macOS ARM64: all nine presets compile. Eight pass help/version. QuickJS with bundling/minification fails at startup with `error: Module not found: jsr:@libs/qrcode`; its task remains available as an experimental reproduction.
- `pnpm --filter @napplet/cli compile:pruned` passes, verifying pnpm task forwarding.
- Full standalone integration passes for pruned V8, combined V8 size flags, unpruned QuickJS, and pruned QuickJS, using empty host-tool PATHs and fresh caches. This covers hosted template creation, config, discovery, debug, encrypted key storage, screenshots, signed dry-run deployment, conformance, Paja, and cached browser reuse. No live publication is performed.
- `pnpm build`: 12 successful tasks, including all five release binaries.
- `pnpm type-check`: 18 successful tasks.
- `pnpm -r test:unit`: 627 passed, two opt-in tests ignored.
- AI-slop 0.12.0: 98/100, zero errors. Existing warnings concern `renderDeployReport` length and `runtimePrelude` nesting; no configuration changes or rule disables.
- `git diff --check` passes.

See `measurements.json` for native sizes and startup results. Smallest successful tested variant is pruned QuickJS at 88,921,282 bytes (84.8 MiB), compared with baseline V8 at 221,025,074 bytes (210.8 MiB). Compilation timings are observations, not controlled benchmarks. Disabling the code cache did not change size in this run, and pruning alone beat the bundled combinations.

## Scope and disposition

No runtime port, default-engine change, CI release change, or protocol change. QuickJS and bundle/minify presets remain opt-in experiments. Deno-generated lockfile pruning was excluded from the change. All work is isolated from the original checkout and the separate CLI usability PR.

Implementation commit: `be8e27a9`.
