---
quick_id: 261011-hdg
status: complete
---

# Standalone CLI tooling

Implemented in c8cbb950. Prepared CLI 0.9.0 and boilerplate 0.4.0 release metadata. The downloaded binary embeds template generation, downloads a SHA-256-verified private Node distribution when browser/Paja tooling is requested, installs maintained packages into an isolated prefix with lifecycle scripts disabled, and invokes package entrypoints by absolute path. Screenshots and default conformance share the same browser launcher. Linux receives verified architecture-specific Chromium packs with libraries and fonts. Browser flags that disable web security or site isolation are filtered out. Custom user-supplied commands remain explicit external choices.

Template creation uses GitHub or HTTP(S) ZIP downloads and in-process extraction, with traversal rejection. The Deno boilerplate adapter imports its implementation statically after compiled macOS testing exposed a fetch timeout with the old dynamic import. Hosts without native keychains receive password-encrypted key files; secrets use authenticated AES-GCM, random salts/IVs and PBKDF2-SHA256 (600,000 iterations). Record identities are authenticated with ciphertext. The password is never stored.

Verification:

- `pnpm build`: 12 tasks passed, including all five release targets and docs.
- `pnpm type-check`: 17 tasks passed.
- `pnpm -r test:unit`: passed; CLI subsequently rerun after authenticated record binding: 192 passed, 2 opt-in integration tests ignored.
- `NAPPLET_TEST_STANDALONE=1 deno test -A packages/cli/tests/standalone_integration_test.ts`: compiled macOS binary, empty PATH, fresh cache, hosted create/init/discover/debug, key store/use/list/delete, PNG capture with exact dimensions, signed inline screenshot dry run with valid JSON stdout, default conformance, Paja help and cache reuse all passed (49 seconds).
- Linux ARM64 binary in unmodified `debian:bookworm-slim` with `PATH=/no-host-tools`: real local-preview PNG and default hosted template creation succeeded. Files in `/tmp/napplet-no-deps-proof`.
- AI-slop staged scan: 100/100, no issues. No rules disabled. Existing full CLI-only scan reports pre-existing console-output and narrative-comment warnings plus an intentional fixed download URL; repository-context changed-code gate passed.
- New CI workflow runs empty-PATH smoke tests for Linux x64/ARM64, macOS x64/ARM64 and Windows x64.

First provisioning needs internet access and a writable private cache; later calls reuse downloaded tooling. Generated Vite development and optional skills.sh remain separate workflows with their own dependencies. Non-GitHub Git transports now require an archive URL or local template directory, documented as a minor compatibility change. No protocol or conformance requirements were changed.

Unrelated root `package.json` workspaces edit and pre-existing local directories were preserved. Only the archive dependency additions were staged from the generated Deno lockfile.
