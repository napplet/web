---
status: verifying
trigger: "Resolve PR #242 review comment 6131874990"
created: 2026-10-14
updated: 2026-10-14
---

# PR #242 Paja release compatibility

## Requirements

Resolve [the review follow-up](https://github.com/napplet/web/pull/242#issuecomment-6131874990): make the conformance CLI release install with compatible Paja peers, and preserve the GAMEPAD subscription `id` rejection and silent reference-shell drop required by the living proposal.

## Evidence and decision

- npm now publishes Paja 0.21.0 (published 2026-10-13T01:38:08.664Z). Its core/NAP peers are `>=0.32.0 <0.35.0`, admitting this PR's 0.34.0 packages. Paja 0.20.1 peers remain `>=0.32.0 <0.33.0`.
- The branch permits `>=0.20.1 <0.22.0` and still locks 0.20.1. Publication alone does not remove that incompatible locked dependency.
- Keep the planned core/NAP 0.34.0 release and require the already-published Paja 0.21.x line. Update the lockfile and docs. Include the correction in the prepared, unpublished conformance CLI 0.3.4 release.
- Current [NAP-GAMEPAD](https://github.com/napplet/naps/pull/108) head `0b28f77e3dfa0f07dd7c0f9d61a7090ee99f3a5e`, Wire Protocol and Error Handling, defines messages without correlation IDs and silent handling of malformed subscriptions. Current NIP-5D PR #2303 head is `020cb8b33a9e4c6b8ca4b2f9d0ed0a67843b68f7`. Keep the existing validator and reference-shell behavior.

## Verification plan

1. Reproduce the peer conflict with packed core/NAP 0.34.0 and published Paja 0.20.1 using strict peer installation.
2. Pack the updated CLI and its unpublished workspace dependencies; install those exact tarballs with npm strict peers and published Paja 0.21.0. Verify resolved package versions and run the installed CLI.
3. Run build, type-check, recursive unit tests, conformance/browser checks, and AI-slop. Confirm both subscribe and unsubscribe reject IDs and are silently dropped by the reference shell.
4. Push the reviewed fix, record the evidence on the PR, and inspect current CI results. No merge or publication is needed to resolve this review comment.

## Resolution and verification

Raised the Paja minimum to `>=0.21.0 <0.22.0`; the lockfile selects 0.21.0 and the compatible Kehto peer graph. Updated the package README, site guide, and the prepared 0.3.4 changelog. The existing `workspace:*` core/NAP dependencies and GAMEPAD validators are preserved.

- Reproduced the old Paja 0.20.1/core 0.34.0 conflict with npm strict peers: `ERESOLVE` and the incompatible `<0.33.0` peer range.
- Packed the actual core 0.34.0, NAP 0.34.0, conformance 0.20.0, and conformance CLI 0.3.4 builds with `pnpm pack`; verified that packed manifests contain normal version dependencies, not workspace protocols.
- A temporary loopback registry served these four unchanged, unpublished tarballs and redirected all other packages to npm. Fresh consumer manifests depended only on conformance CLI 0.3.4. `npm install --strict-peer-deps` and `pnpm install --strict-peer-dependencies` passed without overrides, `--force`, or legacy peer handling. Dependency trees resolved core/NAP 0.34.0 throughout.
- npm initially selected published Paja 0.21.0. Paja 0.21.1 was published during verification; an initial tarball 404 cleared, after which isolated npm and pnpm installs selected 0.21.1 and passed. Both releases retain compatible core/NAP peers.
- The installed CLI captured 640×360 PNGs with both Paja 0.21.0 and 0.21.1 after a fixture received its first GAMEPAD state callback. No GUI browser was opened.
- Direct assertions against the built conformance package accepted valid subscribe/unsubscribe envelopes, rejected an `id` on both, and verified silent reference-shell drops. No protocol behavior changed.
- Build: 12 tasks passed. Types: 18 tasks passed. Recursive unit tests passed. Conformance browser suite: 5 tests passed. Release-tooling and workflow contract tests passed. Frozen workspace install with strict peers and whitespace checks passed.
- AI-slop: 98/100, zero errors, only the existing `fflate` dependency advisory.

Local verification logs and packed-install evidence are under `/tmp/napplet-pr242-*`; the scratch registry root is `/tmp/napplet-pr242-peers.a32qMw`. These tests establish release compatibility without claiming the napplet package set is already on npm. Remote CI and the PR response remain to be verified before closing this debug session.
