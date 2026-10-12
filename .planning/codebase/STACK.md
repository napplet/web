> Historical implementation context, non-normative. Protocol descriptions below may predate the current NIP-5D event schema. Read the actual `5D.md` at the head of [upstream PR 2303](https://github.com/nostr-protocol/nips/pull/2303/files) and the living [NAPs](https://github.com/napplet/naps) before implementing protocol behavior. NIP-5A aggregate-hash manifests and old registration handshakes are not current NIP-5D authority.

# Technology Stack

**Analysis Date:** 2026-03-29

## Languages

**Primary:**
- TypeScript 5.9.3 - Strict, ESM-only across all packages

**Secondary:**
- JavaScript (ES2022 target) - Build output and runtime

## Runtime

**Environment:**
- Node.js 22.x (specified in CI: `.github/workflows/ci.yml`)

**Package Manager:**
- pnpm 10.8.0 (configured in `package.json`)
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**
- Vite 6.3.0 (peer dependency for `@napplet/vite-plugin`)
- nostr-tools 2.23.3 (peer dependency for `@napplet/shim` and `@napplet/shell`; direct dependency for `@napplet/vite-plugin`)

**Build/Dev:**
- tsup 8.5.0 - Used in all three packages (`packages/*/tsup.config.ts`) for bundling TypeScript to ESM
- turborepo 2.5.0 - Monorepo orchestration (configured in `turbo.json`)
- TypeScript 5.9.3 - Compiler and type checking

**Monorepo/Publishing:**
- changesets 2.30.0 - Versioning, changelog, and npm publishing (`pnpm version-packages`, `pnpm publish-packages`)

## Key Dependencies

**Critical:**
- nostr-tools 2.23.3 - Cryptographic signing and verification (Schnorr signatures, Ed25519 key generation, event finalization)
  - Sub-dependencies: @noble/hashes 2.0.1, @noble/curves 2.0.1, @noble/ciphers 2.1.1, @scure/base 2.0.0
  - Used in: `@napplet/shim` (NIP-42 AUTH, signing), `@napplet/shell` (manifest signing), `@napplet/vite-plugin` (manifest signing at build time)

**Infrastructure:**
- @changesets/cli 2.30.0 - Manages versioning and publishes packages to npm

## Configuration

**Environment:**
- VITE_DEV_PRIVKEY_HEX (optional) - Hex-encoded private key for signing NIP-5A manifests at build time in `@napplet/vite-plugin`
  - If not set, plugin skips manifest signing and writes unsigned manifest
  - Used in: `packages/vite-plugin/src/index.ts` (dynamic import of nostr-tools for signing)

**Build:**
- `tsconfig.json` (root) - Shared TypeScript config with ES2022 target, ESNext module, bundler resolution
- `packages/*/tsconfig.json` - Per-package TypeScript configs
- `packages/*/tsup.config.ts` - Per-package build configs (ESM format, source maps, type declarations)
- `turbo.json` - Task pipeline (build → type-check, test depends on build)

## Platform Requirements

**Development:**
- Node.js 22.x or compatible
- pnpm 10.8.0+
- Unix-like environment (Linux, macOS) or Windows with appropriate toolchain

**Production:**
- Node.js 18+ (ESM support required)
- Browsers supporting ES2022 (napplet iframe runtime)
- Vite-based build system for napplet applications using `@napplet/vite-plugin`

## Build Output

**Packages Publish:**
- ESM-only (no CommonJS)
- Type declarations (`.d.ts`) and source maps included
- Distribution: `packages/*/dist/`
- npm registry: `@napplet/shim`, `@napplet/shell`, `@napplet/vite-plugin` (all at v0.1.0, not yet published)

---

*Stack analysis: 2026-03-29*
