---
status: complete
---

# CVM registry selector alignment

Implemented in ebfd0d80 on fix/cvm-registry-selectors. Canonical source: [NAP-CVM #31](https://github.com/napplet/naps/pull/31), current head 28cf1bdb5c6412bfbfcecb79a5a5121e18376f2f, API Surface / Registry / Wire Protocol. This record is non-normative.

## Delivered

- Shared CvmRegistrySelector exported through core, NAP barrel/types, and SDK; at least one selector field is required by TypeScript.
- Registry has/describe/call accept selector objects in both SDK layers and the runtime projection, and the shim emits selector envelopes. Family strings are deliberately removed, with migration examples in the CVM guide and package READMEs.
- Registry options retain the server pin; hash pins live in selectors. Entries require schemaHashes and per-tool schemaHash, and family is optional. Queries expose category.
- Envelope validation accepts selector objects and rejects the former family-only carrier. It remains a structural validator, not a complete shell registry validator.
- Published TypeScript import regression, runtime/SDK/port integration, query/result/error cases and updated shim/conformance tests cover the change. Test hash is SHA-256 of the documented minimal CEP-15 JCS tool payload.
- Changeset versioning prepared core 0.42.0, nap 0.41.0, sdk 0.35.0, shim 0.39.0, conformance 0.28.1, and dependent conformance-cli 0.7.2. JSR imports and tutorial dependency ranges synchronized.

## Verification

Node 22.23.5 (temporary official binary, checksum verified), pnpm 10.8.0:

- `pnpm build`: 13/13 tasks successful.
- `pnpm type-check`: 21/21 tasks successful.
- `pnpm -r test:unit`: 1,593 passed, 3 existing CLI tests ignored, no failures.
- Published CVM types regression passes; 8 runtime CVM integration cases pass.
- `pnpm check:jsr`: passed; `pnpm test:release-tooling`: 4 passed.
- `pnpm dlx aislop@0.12.0 scan --staged .`: 93/100, zero code findings; three advisories in unchanged dependencies (@hono/node-server, @astrojs/svelte, astro). Passes the repository's 70 minimum. No gate configuration changed; .aislop/config.yml is absent on this base.
- `git diff --check`: passed. Source/doc stale-contract scan and inline review completed.

Initial Node 26 package fetches failed with EBADF; Node 22 fetches and installation succeeded. The initial new type test imported the unexported CvmApi directly; corrected to the public NappletGlobal projection and reran the full unit suite successfully.

## Scope limits

Provider selection, CEP-15 verification, live ContextVM servers, and publication were not exercised; this change updates bindings. Unrelated existing readResource behavior returns only the first content entry, contrary to the living draft's full-list contract, and was flagged to the user. Raw MCP request acknowledgment typing also predates the nullable contract. Neither is bundled into #336. The original checkout's unrelated changes remain untouched. Package publishing is left to the normal main-branch GitHub workflows after review and merge.
