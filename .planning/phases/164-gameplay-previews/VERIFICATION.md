# Phase 164 verification

Date: 2026-10-13. No public Nostr events were broadcast. Publication tests used a disposable key and HTTP/WebSocket services bound to `127.0.0.1`.

## Capture and publication

- Browser integration captured a playable canvas artifact at the default six-second duration. Timed clicks and ArrowRight input moved the red square more than 150 pixels between decoded video frames. Encoded dimensions, artifact/clip hashes and exclusive output creation passed. This is a playable test fixture, not a production-game marketing clip.
- Interactive capture and cancellation passed. The first verification opened a visible browser unexpectedly; the user was informed, and visible tests now require both `NAPPLET_TEST_RECORDING=1` and `NAPPLET_TEST_INTERACTIVE=1`. All subsequent recording checks ran headlessly.
- Captured the companion boilerplate's actual self-contained build at 960×600. Viewed the generated thumbnail: only app content appears, with no Paja controls. A second timed recipe clicked Save, and the captured thumbnail showed the stored note and success state, exercising an actual SDK operation. Managed FFmpeg inspection found a VP8 video stream and no audio stream.
- CLI selection tests preserve unknown config fields and existing covers, respect configured build directories, preserve concurrent config edits, and deselect without deleting media.
- Changed build hashes, multiple incompatible builds, and changed video bytes are rejected before upload/publication. Ordinary deployment remains available with `--no-zapstore`.
- Loopback integration invoked the real CLI publication flow, accepted authenticated Blossom uploads, compared exact artifact/video/thumbnail bytes, verified signatures on the WebSocket relay, and checked application-before-manifest ordering. A rebuild produced no additional upload or event.
- NIP-92 metadata includes matching URL, MIME, SHA-256, encoded byte size, dimensions and thumbnail. The video URL is present in application content. Configured covers remain; absent covers use the thumbnail.

## Repository and package checks

- `pnpm build`: 12 tasks passed, including compilation of all five standalone binaries.
- `pnpm type-check`: 17 tasks passed.
- `pnpm -r test:unit`: passed across the workspace. Browser/standalone/loopback suites are explicitly opt-in and were exercised separately.
- Focused publication/selection regression tests: 24 passed. Loopback publication: 1 passed. Headless recording: 1 passed, headed test deliberately skipped on the later run; both capture variants passed on the earlier opt-in run.
- Skill contracts, release tooling, onboarding contracts and workflow contracts passed.
- Main PR's changed-file slop score: 97/100. Existing `commandDeploy` length warning and existing fflate 0.8.2 advisory remain; no rule was disabled. The repository's configured CI gate passes at 70, and its slop check passed.
- Boilerplate: guidance tests, type checking, production build and browser conformance passed (5 pass, 6 evidence-dependent skips). Slop score 100/100 after refreshing affected transitive dependency patches.
- Changeset versioning produced CLI 0.10.0, recording runner 0.4.0, synchronized Deno metadata and tutorial dependency ranges. The runner must be published before released CLI recording commands can install it from npm.

## Standalone platforms

The CI matrix runs a compiled release binary with an empty PATH. Recording tests install the unpublished packed 0.4.0 runner into the private package cache, because it does not exist on npm before release. This is a test-only helper; production resolution remains pinned to the published package and gains no registry override. Tests exercise default capture, automatic encoder installation, cached capture with package/browser proxies unavailable, dry-run metadata, stale-build rejection, and file-preserving deselection.

| Platform | Evidence |
| --- | --- |
| Linux x64 | Fresh-cache standalone and recording suites passed in CI. |
| Linux ARM64 | Fresh-cache standalone and recording suites passed in CI. |
| macOS ARM64 | Local binary recording suite passed with a copied, already verified private Node cache. Fresh local Node download timed out; this result does not claim local fresh-download coverage. Fresh-cache standalone and recording suites passed in CI. |
| macOS x64 | Fresh-cache standalone and recording suites passed in CI. |
| Windows x64 | Fresh-cache standalone and recording suites passed in CI. |

Initial macOS CI builds exhausted the default TypeScript declaration worker heap before running the recording test. Serial package builds with a 4 GiB heap resolved that build failure. All five targets passed at implementation commit `1f8ad98bd47df619d0cb677fe01a61a7cbe5531c`; later changes only complete documentation and release notes. See [standalone CI](https://github.com/napplet/web/actions/runs/38483632136) for the complete matrix.

## Scope and interoperability

[COVERAGE.md](COVERAGE.md) accounts for every organization repository, all 17 web workspace packages, every NAP domain directory and relevant Kehto/Paja consumers. No current default branch contains an application-preview gallery; catalog hover/focus, offscreen/hidden-tab and motion/data preferences therefore have no applicable UI to modify or claim tested. The media and static fallback are ready for downstream clients.

NIP-5D PR 2303, NIP-92, Software Applications PR 1336 and the app-reference proposal were read/rechecked at current heads; source links and revisions are in RESEARCH.md. Software Applications and the existing manifest app-reference remain proposals. No new manifest media fields or NAP requirements were introduced. Recording limits are authoring policy.

## Delivery

- [Main implementation PR #244](https://github.com/napplet/web/pull/244).
- [Boilerplate PR #8](https://github.com/napplet/boilerplate/pull/8).
- Original dirty napplet and Kehto workspaces preserved. Separate worktrees and explicit staging used. Nothing merged or publicly published.
