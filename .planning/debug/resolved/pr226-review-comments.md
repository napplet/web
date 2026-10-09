---
status: resolved
trigger: Validate and resolve PR 226 inline review comments
---

# PR 226 review comments

## Evidence

- Review 4232577500: `resolveDeployServers` returns unvalidated configured values or `server` tag values, including undefined from `["server"]`. The uploader calls `endsWith` outside its request try/catch.
- Canonical [NIP-5D Manifest](https://github.com/nostr-protocol/nips/pull/2303) describes `server` values as Blossom server origin hints. Validation belongs at the CLI network boundary; metadata remains optional.
- Review 4232577559: the original quick-task plan says `in-progress`, whereas its summary and state entry record completion.

## Resolution

Both findings are valid. The CLI validates all selected destinations as HTTP(S) origins before manifest signing and again at the network-deployment boundary. Missing values, unsupported schemes, credentials, paths, queries, fragments, and repaired URL syntax produce a positional error without echoing credentials. Root trailing slashes, ports, IPv6, explicit-config precedence, hint deduplication, and signed-event precedence remain supported. Updated CLI documentation and the existing CLI changeset. Corrected the original quick-task plan to `complete`.

## Verification

- Three new regression tests pass: a signed CLI dry run with a malformed sidecar reports the validation error, the origin matrix covers config/template/signed hints and precedence, and invalid sidecar/HTML/config destinations cause zero fetch, upload-authorization signing, or relay-publish calls.
- `pnpm build`, `pnpm type-check`, and full `pnpm test` pass. The latter includes the workspace unit suite and tutorial browser conformance (5 passed, 0 failed, 6 skipped).
- Initial overlapping build/test invocations raced on generated build outputs; a missing local Vue dependency link also surfaced. Refreshed dependencies with the frozen lockfile, then reran build and full tests sequentially successfully. No dependency manifest or lockfile changes.
- AI-slop 0.12.0: 73/100, above the configured minimum of 70. The same three existing complexity findings and four dependency advisories remain; no rule changes.
- `git diff --check` passes.
