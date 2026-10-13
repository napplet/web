---
phase: 164-gameplay-previews
plan: 01
subsystem: authoring
completed: 2026-10-13
requirements-completed: [VIDEO-CAPTURE, VIDEO-PUBLISH, VIDEO-PLAYBACK, VIDEO-COVERAGE, VIDEO-SHIP]
---

# Gameplay previews delivered

Added `napplet record` using the existing managed browser/Paja tooling. It captures exact build bytes through interactive play or timed input recipes, saves silent WebM plus thumbnail and provenance, and selects the clip for the existing optional application publisher. Publication rejects stale or changed clips, preserves covers, uploads through Blossom and attaches NIP-92 metadata to kind 32267. Recording adds no protocol surface.

Boilerplate documentation and example recipes now cover capture and review. Its stale dependencies emitted external assets; upgrading published SDK/plugin/conformance versions, adding artifact description and correcting old manifest guidance made the real starter runnable and recordable. A timed Save action succeeded in the captured starter.

## Verification

Workspace build, type checks, recursive unit tests, skill/release/onboarding/workflow contracts and docs build passed. Headless recording tests decoded actual moving frames; interactive capture/cancellation passed under explicit opt-in. Real loopback HTTP/WebSocket publication verified byte integrity and event signatures without public broadcasts. All five native standalone targets passed fresh-cache CI, including offline encoder/browser reuse and stale-selection rejection.

Coverage includes all seven organization repositories, all 17 web workspace packages and relevant Kehto/Paja packages and demos. No inspected default branch has an application-preview gallery, so the conditional playback-UI requirement is not applicable; this is documented rather than claimed implemented. Static cover metadata remains available for receiving clients.

Main slop gate passed at 97 with existing command-length and fflate-advisory findings; boilerplate scores 100. No rule was disabled. Detailed evidence and known limitations are in VERIFICATION.md and COVERAGE.md.

## Delivery and deviations

- Web PR: https://github.com/napplet/web/pull/244
- Boilerplate PR: https://github.com/napplet/boilerplate/pull/8
- Versioned CLI 0.10.0 and conformance runner 0.4.0. Release the npm runner before the CLI command needs it; pre-release CI installs the packed runner through a test-only cache helper.
- Local fresh Node download timed out. Local native proof reused a verified private runtime; CI subsequently passed fresh provisioning on all five platforms.
- Initial macOS declaration builds exhausted the default heap. Serial package builds with a 4 GiB heap passed.
- The first interactive test opened a visible browser unexpectedly. The user was told no input was needed; headed tests now need a separate explicit opt-in. Subsequent checks were headless.
- Existing Software Applications and manifest app-reference proposals remain unresolved interoperability limits. No new manifest media tags or NAPs were invented.
- Original napplet and Kehto dirty workspaces remain untouched. No merges, package publishing, or public Nostr publication occurred.
