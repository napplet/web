---
status: complete
---

# QuickJS release binaries

All five platform compile tasks now use `--engine quickjs --exclude-unused-npm`. Release, standalone smoke, main CI, and npm build workflows pin Deno 2.9.5. Smoke tests also trigger on release-workflow changes. A failed binary build matrix blocks asset publication while preserving the release job's independence from JSR publication success. Names, checksums, permissions, and comparison presets are unchanged.

Workflow contracts verify that every release target uses the selected engine/pruning flags without bundling/minification, that native smoke tests cover the same targets and artifacts, and that the complete build matrix must succeed before upload. README and the existing package changeset now describe the selected release engine.

## Local verification

- `pnpm build`: 12 tasks pass, including all five QuickJS cross-compiles.
- `pnpm type-check`: 18 tasks pass.
- `pnpm -r test:unit`: 627 tests pass, two opt-in tests ignored.
- `pnpm test:workflow-contracts`: passes, including seven release/workflow contracts.
- Actual `dist/napplet-darwin-aarch64` release binary: full standalone integration passes with empty host-tool PATH and fresh caches (3m9s). Covers creation, configuration, discovery, key storage, screenshots, signed dry-run deployment, conformance, Paja, and cached tool reuse.
- AI-slop 0.12.0: 98/100, zero errors, two existing complexity warnings; no rule disables.
- `git diff --check`: passes.

Local macOS ARM64 cross-compile sizes, Deno 2.9.5:

| Artifact | Bytes |
| --- | ---: |
| napplet-linux-x86_64 | 113,916,424 |
| napplet-linux-aarch64 | 113,986,056 |
| napplet-darwin-x86_64 | 96,115,376 |
| napplet-darwin-aarch64 | 88,921,282 |
| napplet-windows-x86_64.exe | 95,487,701 |

Native execution on the other four platforms is verified by PR #249's Standalone CLI matrix after push. This task changes release configuration; it does not merge the PR or publish binaries. The existing comparison table in the PR body is preserved.
